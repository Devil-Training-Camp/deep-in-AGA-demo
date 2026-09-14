/**
 * 流式问答(`POST /api/chat`)的消费侧类型 —— 前端 hook 与后端 handler 引用同一份定义。
 *
 * 单一事实源是 `api.ts`(由 `schema.yaml` 经 openapi-typescript 生成),本文件不重新定义
 * 事件/请求的字段,只从生成类型里 **取别名 + 派生** 出两端实际要用的形态:
 * - 后端 handler:要一个「事件对象 → SSE 线格式(event:/data:)」的编码器契约,以及中断信号。
 * - 前端 hook:要一个「SSE 线格式 → 事件对象」的解析器契约,以及消费过程中的流式状态机。
 *
 * schema 变更后重跑 `pnpm --filter @kb/shared gen:types`,此处别名自动跟随,两端不会漂移。
 *
 * 命名与取值对齐 architecture-design.md §四 API 契约、CLAUDE.md 流内错误/中断/残答落库语义,
 * 以及既有 `sse.ts`(手写契约,与生成类型字段一致)。此文件只放类型,不放实现。
 */

import type { components, operations } from "./api.js";

/* ────────────────────────────── 请求侧(两端共用) ────────────────────────────── */

/** `/api/chat` 请求体。sessionId 是易失上下文键,conversationId 是持久历史键。 */
export type ChatRequest = components["schemas"]["ChatRequest"];

/* ────────────────────────────── 事件侧(两端共用) ────────────────────────────── */

/** SSE 事件类型字面量:`meta` | `token` | `error` | `done`,前端按 `event:` 分派。 */
export type SseEventType = components["schemas"]["SseEventType"];

/** 单个 SSE 事件的判别联合(data JSON 的形态),按 `type` 收窄。 */
export type SseEvent = components["schemas"]["SseEvent"];

export type SseMetaEvent = components["schemas"]["SseMetaEvent"];
export type SseTokenEvent = components["schemas"]["SseTokenEvent"];
export type SseErrorEvent = components["schemas"]["SseErrorEvent"];
export type SseDoneEvent = components["schemas"]["SseDoneEvent"];

/**
 * 事件类型 → 事件对象 的映射表。用于按 `type` 精确取出某一类事件,
 * 供两端写 `switch (evt.type)` 分派或声明 per-type 回调时收窄。
 */
export interface SseEventMap {
  meta: SseMetaEvent;
  token: SseTokenEvent;
  error: SseErrorEvent;
  done: SseDoneEvent;
}

/** 取某一类事件的对象类型,如 `SseEventOf<"token">` = `SseTokenEvent`。 */
export type SseEventOf<T extends SseEventType> = SseEventMap[T];

/* ─────────────────────────── 线格式(wire)与编解码契约 ─────────────────────────── */

/**
 * 一帧 SSE 在网络上的文本形态:`event: <type>\n` + `data: <JSON>\n\n`。
 * handler 负责把 {@link SseEvent} 编码成它,hook 负责把它解析回 {@link SseEvent}。
 * 抽成类型是为了让「编码器产出」与「解析器输入」由同一处约束,防止一端改了分隔约定另一端不知情。
 */
export type SseWireFrame = `event: ${SseEventType}\ndata: ${string}\n\n`;

/**
 * 后端 handler 侧:把事件对象编码为一帧 SSE 文本的编码器。
 * 实现放在 web 的 lib(如 `lib/rag` / chat route),此处只约束签名,保证与解析器对称。
 */
export type SseEventEncoder = (event: SseEvent) => SseWireFrame;

/**
 * 前端 hook 侧:把收到的一段 SSE 文本(可能含 0..N 个完整帧)解析为事件对象数组。
 * 返回数组而非单个,因为一次 `ReadableStream` 读片可能跨帧/含多帧;不完整的尾帧由实现自行缓存。
 */
export type SseEventParser = (chunk: string) => SseEvent[];

/* ─────────────────────────── 前端 hook 的流式状态机 ─────────────────────────── */

/**
 * hook 消费一次问答的生命周期状态:
 * - idle:未发起
 * - streaming:已连接、正在逐 token 追加
 * - done:完整收束(收到 `done`)
 * - error:流内错误(收到 `error` 事件)或连接层失败
 * - aborted:用户主动中断(AbortController.abort());半截回答不落库,见 CLAUDE.md 残答语义
 */
export type ChatStreamStatus = "idle" | "streaming" | "done" | "error" | "aborted";

/**
 * hook 对外暴露的可渲染状态。answer 随 token 事件增量拼接;
 * grounded / topSimilarity 来自首个 meta 事件(grounded=false 时回答属常识推测,需求功能 3);
 * conversationId 来自 done 事件,供下一轮追问回传复用会话。
 */
export interface ChatStreamState {
  status: ChatStreamStatus;
  /** 已渲染的回答文本,answer 区只向下追加(呼应 CLS ≤ 0.1 的验收)。 */
  answer: string;
  /** 是否命中文档依据;meta 到达前为 undefined。 */
  grounded?: boolean;
  /** 检索最高相似度;meta 到达前为 undefined。 */
  topSimilarity?: number;
  /** 完整收束后回传的持久化会话 ID;done 到达前为 undefined。 */
  conversationId?: string;
  /** 流内错误的提示文案(来自 error 事件的 message),在已渲染内容后追加显示。 */
  error?: string;
}

/**
 * 发起一次流式问答时的入参:请求体 + 中断信号。
 * signal 由前端 `AbortController` 提供,透传到后端 `request.signal` 再取消上游 LLM fetch(中断契约)。
 */
export interface ChatStreamOptions {
  body: ChatRequest;
  signal?: AbortSignal;
}

/**
 * per-event 回调,供 hook 内部或调用方按需订阅单类事件。
 * 全部可选;未提供的事件类型静默忽略。
 */
export interface ChatStreamHandlers {
  onMeta?: (event: SseMetaEvent) => void;
  onToken?: (event: SseTokenEvent) => void;
  onError?: (event: SseErrorEvent) => void;
  onDone?: (event: SseDoneEvent) => void;
}

/** hook 返回值:当前状态 + 发起/中断两个动作。实现放在 web 端 `useChatStream`。 */
export interface UseChatStreamResult {
  state: ChatStreamState;
  /** 发起一次问答(建立 SSE 连接、消费事件、驱动 state)。 */
  start: (options: ChatStreamOptions) => Promise<void>;
  /** 主动中断当前流(触发 AbortController.abort())。 */
  abort: () => void;
}

/* ─────────────────────────── 类型守卫(两端共用,零运行时依赖也可自行实现) ─────────────────────────── */

/** 按 `type` 收窄 SseEvent 的守卫签名族;实现方可据此写一组 isMeta/isToken/… 守卫。 */
export type SseEventGuard = <T extends SseEventType>(
  event: SseEvent,
  type: T,
) => event is SseEventOf<T>;

/* ─────────────────────────── 与生成 operation 的一致性校验 ─────────────────────────── */

/**
 * 编译期断言:上面取的 ChatRequest / SseEvent 别名确实等于 `chat` operation 在
 * api.ts 里声明的请求体与 text/event-stream 响应体。若 schema 改动导致漂移,此处会报错,
 * 逼迫回来同步别名 —— 这是「两端共用一份定义」不失效的守门。
 *
 * 导出仅为满足 `noUnusedLocals`;这两个别名恒为 `true`,无运行时意义,消费方不必引用。
 */
export type AssertChatRequestMatchesOperation = Expect<
  Equal<ChatRequest, operations["chat"]["requestBody"]["content"]["application/json"]>
>;
export type AssertSseEventMatchesOperation = Expect<
  Equal<
    SseEvent,
    operations["chat"]["responses"][200]["content"]["text/event-stream"]
  >
>;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
