/**
 * LLM / Embedding 供应商抽象层 —— 接口对齐 architecture-design.md §六.2。
 *
 * 红线(CLAUDE.md):业务代码只依赖这里的接口,绝不直接引任何厂商 SDK。
 * 换厂商(如 embedding 迁到自托管 BGE-M3)只替换实现,业务代码不动。
 * 具体厂商未定(待确认项 3),故本文件只定义契约 + 注册入口,不含任何厂商实现。
 */

/**
 * 供应商侧(wire)消息的 role —— 刻意独立于 DB 的 MessageRole。
 *
 * 为什么不复用 db/types.ts 的 MessageRole:那个是 **messages 表**的 role 域,
 * 表里只落 user/assistant(残答不写、grounded 也是 assistant,见 CLAUDE.md)。
 * 而发给厂商的 wire 消息需要 'system' 来承载「检索片段 / 系统指令」——system 只
 * 活在「发给 LLM 的这一跳」,绝不进数据库。两个 role 域分开,避免"DB 能存 system"的错觉。
 */
export type LLMRole = "system" | "user" | "assistant";

/** 供应商侧的消息形状(与 DB messages 表解耦:只取对话所需的 role + content)。 */
export interface LLMMessage {
  role: LLMRole; // 'system' | 'user' | 'assistant';system 仅用于 wire,不落库
  content: string;
}

export interface LLMProvider {
  /** 流式生成。signal 透传给上游 fetch —— 前端中断即取消上游、停止计费(SSE 止损红线)。 */
  streamChat(messages: LLMMessage[], signal: AbortSignal): AsyncIterable<string>;
  /** query rewriting:结合历史把追问改写成独立完整问题(检索前置步骤)。 */
  rewrite(history: LLMMessage[], question: string): Promise<string>;
}

export interface EmbeddingProvider {
  /** 批量 embedding,返回 1024 维向量(维度是全系统硬约束,实现方必须保证)。 */
  embed(texts: string[]): Promise<number[][]>;
}

/** Embedding 维度硬约束 —— 与 doc_chunks.embedding vector(1024) 必须一致。 */
export const EMBEDDING_DIM = 1024;

// ── 注册入口 ──────────────────────────────────────────
// 厂商实现在确定后通过 registerProviders 注入(通常在应用启动处)。业务代码用 getter 取,
// 未注册即抛明确错误,而不是拿到 undefined 在深处 NPE。
let llmProvider: LLMProvider | null = null;
let embeddingProvider: EmbeddingProvider | null = null;

export function registerProviders(providers: {
  llm?: LLMProvider;
  embedding?: EmbeddingProvider;
}): void {
  if (providers.llm) llmProvider = providers.llm;
  if (providers.embedding) embeddingProvider = providers.embedding;
}

export function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    throw new Error("LLMProvider 未注册(厂商待定,见待确认项 3;应用启动时 registerProviders 注入)");
  }
  return llmProvider;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddingProvider) {
    throw new Error("EmbeddingProvider 未注册(厂商待定,见待确认项 3;应用启动时 registerProviders 注入)");
  }
  return embeddingProvider;
}
