/**
 * SSE 事件契约(architecture-design.md §API 契约 + CLAUDE.md 功能行为约束)。
 *
 * 流式作答的事件序列:
 * - meta:首先发出,携带 grounded 命中状态与最高相似度分值
 * - token:逐字追加的回答内容
 * - error:首字节发出后(HTTP 200)的错误只能走流内传递,前端在已渲染内容后追加提示,
 *          不依赖 HTTP 状态码(CLAUDE.md 流内错误)
 * - done:正常收束
 */
export type SseEventType = "meta" | "token" | "error" | "done";

/** grounded=false 表示检索最高相似度低于 GROUNDED_SIMILARITY_THRESHOLD,回答属常识推测。 */
export interface SseMetaEvent {
  type: "meta";
  grounded: boolean;
  topSimilarity: number;
}

export interface SseTokenEvent {
  type: "token";
  delta: string;
}

export interface SseErrorEvent {
  type: "error";
  message: string;
}

export interface SseDoneEvent {
  type: "done";
}

export type SseEvent = SseMetaEvent | SseTokenEvent | SseErrorEvent | SseDoneEvent;
