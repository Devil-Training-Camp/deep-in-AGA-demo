import type { LLMMessage } from "../llm/index.ts";
import type { RetrievedChunk } from "../db/doc-chunks.ts";
import { GROUNDED_SIMILARITY_THRESHOLD, CONTEXT_TOKEN_BUDGET } from "../../config/params.ts";

/**
 * 组装发给 LLM 的对话消息 —— 把「检索片段 + 历史 + 当前问题」拼成 streamChat 的输入。
 *
 * 归属:lib/rag(检索管道)。红线(CLAUDE.md):只依赖 lib/llm 抽象层的 LLMMessage,
 * 不引任何厂商 / 框架 SDK。
 *
 * 与原始请求措辞的对照(几处按本项目约定落地,非照搬):
 *   - 路径:src/lib/rag/context.ts,不是 packages/web/...(本项目非 monorepo,无 packages/)。
 *   - 类型:LLMMessage[](lib/llm 抽象),不是 AI SDK 的 CoreMessage[];输出喂给
 *     LLMProvider.streamChat,不是 streamText —— 用 SDK 类型会击穿供应商抽象层。
 *   - "注入 system message":LLMMessage.role 现含 'system'(仅 wire、不落库),故片段
 *     确实拼成一条 system 消息;若片段全被过滤则不加 system(grounded=false 场景,
 *     由上层据此标注常识推测,本函数不负责标注)。
 *
 * token 预算为何用字符数估算:LLMMessage 不带 token 计数,且不引 tiktoken(OpenAI 分词器,
 * 与火山厂商不匹配,同 chunk.ts 决策)。用字符数做**保守上界**近似 token 足够本期需要;
 * 真要精确计费再在 provider 层接厂商分词器,不在这里。
 */

/** 一条历史对话消息(会话上下文,来自 lib/session 的进程内内存,不读 messages 历史表)。 */
export type HistoryMessage = LLMMessage; // { role: 'user' | 'assistant', content }

export interface BuildMessagesInput {
  /** 向量检索到的片段(searchChunks 结果),按相似度降序。 */
  chunks: RetrievedChunk[];
  /** 完整会话历史(最近在后),来自 lib/session;本函数只截取、不回读 DB。 */
  history: HistoryMessage[];
  /** 当前用户问题(已由 query rewriting 改写为独立问题,若走了那步)。 */
  question: string;
}

/** system 提示模板:交代「基于资料回答、资料不足要如实说」的边界(与 grounded 语义一致)。 */
function renderSystemPrompt(chunks: RetrievedChunk[]): string {
  const refs = chunks
    .map((c, i) => `[${i + 1}] ${c.text}`)
    .join("\n\n");
  return [
    "你是知识问答助手。请优先依据下面提供的「参考资料」回答用户问题。",
    "若参考资料不足以回答,如实说明并明确标注这部分属于常识推测,不要编造资料来源。",
    "",
    "参考资料:",
    refs,
  ].join("\n");
}

/** 字符数近似 token(保守上界:一个字符按最多一个 token 计)。 */
function approxTokens(text: string): number {
  return text.length;
}

/**
 * 组装 streamChat 的输入消息。三步:
 *   1) 过滤低相似度片段(< GROUNDED_SIMILARITY_THRESHOLD),剩下的拼成一条 system 消息;
 *      全被过滤则不加 system(避免把噪声/空资料当依据)。
 *   2) 从历史最近端往前累加,控制在 CONTEXT_TOKEN_BUDGET 以内;**最近一轮无条件保留**
 *      (哪怕它自己就超预算 —— 宁可略超也不能把当前问题的直接上文丢了)。
 *   3) 追加当前 user 问题。
 *
 * @returns LLMMessage[](顺序:[system?] → 截取后的历史 → 当前 user 问题)
 */
export function buildMessages(input: BuildMessagesInput): LLMMessage[] {
  const { chunks, history, question } = input;
  const messages: LLMMessage[] = [];

  // ── 第一步:片段注入 system(过滤低相似度噪声)──────────────────
  const relevant = chunks.filter((c) => c.similarity >= GROUNDED_SIMILARITY_THRESHOLD);
  if (relevant.length > 0) {
    messages.push({ role: "system", content: renderSystemPrompt(relevant) });
  }

  // ── 第二步:按 token 预算截历史,保留最近一轮不截 ────────────────
  const trimmed = trimHistoryToBudget(history, CONTEXT_TOKEN_BUDGET);
  messages.push(...trimmed);

  // ── 第三步:追加当前 user 问题 ──────────────────────────────────
  messages.push({ role: "user", content: question });

  return messages;
}

/**
 * 从历史最近端往前保留,累计 token 不超 budget;但**最近一轮永不截**。
 *
 * "最近一轮"的定义:历史末尾连续的、直到(含)最近一条 user 的那段
 * ——典型是 [..., user, assistant] 或末尾单条 user。它是当前问题的直接上文,
 * 截掉会让追问失去指代,故无条件保留,即便它自身已超预算(此时只保留这一轮)。
 * 更早的对话再按预算从后往前尽量多留。
 */
export function trimHistoryToBudget(history: HistoryMessage[], budget: number): HistoryMessage[] {
  if (history.length === 0) return [];

  // 定位「最近一轮」的起点:从末尾往前,跨过尾部的 assistant,停在最近一条 user 处。
  let roundStart = history.length - 1;
  while (roundStart > 0 && history[roundStart].role !== "user") {
    roundStart -= 1;
  }
  // roundStart 现指向最近一条 user(或 0)。最近一轮 = [roundStart .. end],无条件保留。
  const mustKeep = history.slice(roundStart);
  const kept: HistoryMessage[] = [...mustKeep];
  let used = mustKeep.reduce((sum, m) => sum + approxTokens(m.content), 0);

  // 更早的消息(roundStart 之前),从后往前尽量塞进剩余预算。
  for (let i = roundStart - 1; i >= 0; i--) {
    const cost = approxTokens(history[i].content);
    if (used + cost > budget) break;
    kept.unshift(history[i]);
    used += cost;
  }
  return kept;
}
