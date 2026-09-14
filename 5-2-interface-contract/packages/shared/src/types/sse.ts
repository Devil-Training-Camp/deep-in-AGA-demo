/**
 * SSE 事件契约(architecture-design.md §API 契约 + CLAUDE.md 功能行为约束)。
 *
 * 事件字段的单一事实源是 `api.ts`(由 `schema.yaml` 生成);本文件从生成类型取别名,
 * 不再手写字段,避免与 schema 漂移。消费侧类型(编解码、hook 状态机)见 `streaming.ts`。
 *
 * 流式作答的事件序列:
 * - meta:首先发出,携带 grounded 命中状态与最高相似度分值
 * - token:逐字追加的回答内容(字段名 delta)
 * - error:首字节发出后(HTTP 200)的错误只能走流内传递,前端在已渲染内容后追加提示,
 *          不依赖 HTTP 状态码(CLAUDE.md 流内错误)
 * - done:正常收束,回传持久化 conversationId
 */

import type { components } from "./api.js";

export type SseEventType = components["schemas"]["SseEventType"];

/** grounded=false 表示检索最高相似度低于 GROUNDED_SIMILARITY_THRESHOLD,回答属常识推测。 */
export type SseMetaEvent = components["schemas"]["SseMetaEvent"];

export type SseTokenEvent = components["schemas"]["SseTokenEvent"];

export type SseErrorEvent = components["schemas"]["SseErrorEvent"];

export type SseDoneEvent = components["schemas"]["SseDoneEvent"];

export type SseEvent = components["schemas"]["SseEvent"];
