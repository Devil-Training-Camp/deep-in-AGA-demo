import { getCurrentUser } from "../../../lib/auth/index.ts";
import {
  getRecentContext,
  getConversationId,
  bindConversationId,
  appendRound,
} from "../../../lib/session/index.ts";
import { getLLMProvider, getEmbeddingProvider } from "../../../lib/llm/index.ts";
import { searchChunks } from "../../../lib/db/doc-chunks.ts";
import { buildMessages } from "../../../lib/rag/context.ts";
import {
  createConversation,
  getConversationForUser,
  touchConversation,
  appendMessage,
} from "../../../lib/db/conversations.ts";
import { RETRIEVAL_TOP_K, GROUNDED_SIMILARITY_THRESHOLD } from "../../../config/params.ts";

/**
 * POST /api/chat —— SSE 流式问答。
 *
 * 与原始请求措辞的对照(按本项目权威契约落地,非照搬):
 *   - 路径:src/app/api/chat/route.ts(本项目非 monorepo,无 packages/web/)。
 *   - 请求体:{ knowledgeBaseId, sessionId, question }(architecture-design.md §四.4),
 *     **不是 AI-SDK 的 messages[]** —— 故不存在"取最后一条 user message";当前问题就是
 *     body.question(且检索前先经 query rewriting 改写)。
 *   - 生成:走 lib/llm 的 streamChat(厂商是火山方舟,业务代码不碰 Claude/厂商 SDK),
 *     **不是 streamText**;返回用原生 ReadableStream + 自定义 `event:` 帧,
 *     **不是 toDataStreamResponse()**(用 AI SDK 会击穿供应商抽象层,违反技术栈约束)。
 *
 * 流程(严格对齐 §五.2 时序图):
 *   鉴权 → 取 sessionId 最近 N 轮(进程内内存,不读 messages 表)→ query rewriting →
 *   embedding(改写后问题)→ 单库向量检索 → grounded 判定 → 流式生成 →
 *   逐 token 发 event: token → event: meta {grounded} → event: done {conversationId}。
 *
 * 红线:
 *   - 单长驻 Node 进程跑 SSE,必须声明 runtime=nodejs + dynamic=force-dynamic。
 *   - 中断止损:request.signal 透传给上游 LLM fetch,前端 abort → 停止计费。
 *   - 首字节(HTTP 200)后的错误只走 event: error 在流内传递,不靠 HTTP 状态码。
 *   - 残答不写库:中断产生的半截回答既不 append messages,也不进会话窗口;
 *     仅完整生成的回答才落库 + 进上下文。grounded=false 的常识推测答案算一次正常作答,照常落库。
 *   - 密钥只在 provider 层从 env 读,本 route 不碰任何 key。
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

/** 把一个自定义 SSE 事件序列化成 `event: X\ndata: {...}\n\n`。 */
function sseFrame(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

interface ChatBody {
  knowledgeBaseId: number;
  sessionId: string;
  question: string;
  /** 可选:前端在上一轮 done 拿到后回传,显式复用同一持久化会话。 */
  conversationId?: number;
}

/** 解析并校验请求体形状;不合法返回 null(上层 400)。 */
function parseBody(raw: unknown): ChatBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const b = raw as Record<string, unknown>;
  const knowledgeBaseId = b.knowledgeBaseId;
  const sessionId = b.sessionId;
  const question = b.question;
  if (typeof knowledgeBaseId !== "number" || !Number.isInteger(knowledgeBaseId)) return null;
  if (typeof sessionId !== "string" || sessionId.trim() === "") return null;
  if (typeof question !== "string" || question.trim() === "") return null;
  const conversationId =
    typeof b.conversationId === "number" && Number.isInteger(b.conversationId)
      ? b.conversationId
      : undefined;
  return { knowledgeBaseId, sessionId, question: question.trim(), conversationId };
}

export async function POST(request: Request): Promise<Response> {
  // ── 鉴权(首字节之前,失败走 HTTP 401,不进 SSE)──────────────
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "未认证" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 请求体校验(仍在首字节之前,失败走 HTTP 400)────────────
  let bodyRaw: unknown;
  try {
    bodyRaw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求体不是合法 JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const body = parseBody(bodyRaw);
  if (!body) {
    return new Response(
      JSON.stringify({ error: "请求体需为 { knowledgeBaseId, sessionId, question }" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // sessionId 归属校验:若前端显式带了 conversationId,必须归属当前用户(防读他人上下文/IDOR)。
  // 首轮(无 conversationId)由后端新建,天然归属自己。
  if (body.conversationId !== undefined) {
    const owned = await getConversationForUser(body.conversationId, user.id);
    if (!owned) {
      // 存在但不属于你 / 不存在,一律 403,不泄露存在性。仍在首字节前 → 走 HTTP 状态码。
      return new Response(JSON.stringify({ error: "无权访问该会话" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 中断止损:把前端断连信号透传给下游所有上游 fetch(embedding / LLM 流)。
  const signal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 累积完整回答;仅当「未中断且成功跑完」才落库 + 进会话窗口(残答不落)。
      let fullAnswer = "";
      let firstByteSent = false;

      const safeEnqueue = (chunk: Uint8Array): void => {
        // 前端已断开时 enqueue 会抛,吞掉即可(流已无人接收)。
        try {
          controller.enqueue(chunk);
        } catch {
          /* 连接已关闭,忽略 */
        }
      };

      try {
        // ── 取 sessionId 最近 N 轮上下文(进程内内存,绝不读 messages 表)──
        const history = getRecentContext(body.sessionId);

        // ── query rewriting:结合历史把追问改写成独立完整问题(检索前置)──
        // rewrite 失败属首字节前的准备阶段错误,归到外层 catch;若已发首字节则走 event: error。
        const llm = getLLMProvider();
        const rewritten = await llm.rewrite(history, body.question);

        // ── embedding(改写后问题)→ 查询向量 ────────────────────
        const embedding = getEmbeddingProvider();
        const [queryVec] = await embedding.embed([rewritten]);
        if (!queryVec) {
          throw new Error("embedding 返回为空");
        }

        // ── 单库向量检索 top-K(强制单库,不跨库)────────────────
        const chunks = await searchChunks(body.knowledgeBaseId, queryVec, RETRIEVAL_TOP_K);

        // ── grounded 判定:最高相似度 < 阈值 → grounded=false(转常识推测)──
        const topSimilarity = chunks.length > 0 ? chunks[0].similarity : 0;
        const grounded = topSimilarity >= GROUNDED_SIMILARITY_THRESHOLD;

        // ── 组装发给 LLM 的消息(片段注入 system + 截历史 + 当前问题)──
        // 注:检索用改写后的问题,但发给 LLM 的当前问题用**原问题**,保留用户原始表述。
        const messages = buildMessages({ chunks, history, question: body.question });

        // ── 流式生成:signal 透传;逐 token 发 event: token ────────
        for await (const token of llm.streamChat(messages, signal)) {
          if (!firstByteSent) {
            firstByteSent = true;
          }
          fullAnswer += token;
          safeEnqueue(sseFrame("token", { text: token }));
        }

        // 生成完整跑完(未被中断)才走到这里。先发 grounded meta。
        safeEnqueue(sseFrame("meta", { grounded }));

        // ── 完整回答才落库 + 进会话窗口(残答分支永远到不了这里)──
        // 首轮无 conversationId → 新建一行 conversation 并绑定到该 session;后续复用。
        let conversationId = body.conversationId ?? getConversationId(body.sessionId);
        if (conversationId === null || conversationId === undefined) {
          const conv = await createConversation(user.id);
          conversationId = conv.id;
          bindConversationId(body.sessionId, conversationId);
        } else {
          await touchConversation(conversationId);
        }

        // append-only:一问一答两条(grounded=false 的常识推测答案同样算正常作答,照常落)。
        await appendMessage({ conversationId, role: "user", content: body.question });
        await appendMessage({ conversationId, role: "assistant", content: fullAnswer });
        // 进程内会话窗口也追加本轮(供下一次追问做上下文)。
        appendRound(body.sessionId, body.question, fullAnswer);

        // ── done:回传 conversationId(前端后续可显式复用)────────
        safeEnqueue(sseFrame("done", { conversationId }));
        controller.close();
      } catch (err) {
        // 中断:前端 abort → 上游 fetch 抛 AbortError。残答不落库、不进窗口,静默收尾即可。
        if (signal.aborted || (err instanceof Error && err.name === "AbortError")) {
          // 不记为错误(用户主动中断),也不发 event: error;直接关闭。
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }

        // 非中断的真错误:记日志(不含 question/answer 正文,messages.content 禁进排障日志)。
        console.error(
          `[chat] user=${user.id} kb=${body.knowledgeBaseId} 生成失败:`,
          err instanceof Error ? err.message : err,
        );

        if (firstByteSent) {
          // 首字节已发 → 只能走流内 event: error(不靠 HTTP 状态码)。
          safeEnqueue(
            sseFrame("error", { code: "GENERATION_FAILED", message: "生成失败,请重试" }),
          );
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        } else {
          // 首字节未发 → 用流错误终止(此时 HTTP 头虽已 200,但正文尚无 event 帧,
          // 交给运行时以流中断表现;前端 fetch 会在读取时感知失败)。
          controller.error(err);
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
