# `src/types/` — 领域类型与契约

`@kb/shared` 的类型定义,web/db 共享。来源是 `architecture-design.md` 的 DDL(§三)、API 契约(§四)与 CLAUDE.md 的行为约束。

## 放什么

- `api.ts` — **由 `../api/schema.yaml` 经 openapi-typescript 生成**(`pnpm --filter @kb/shared gen:types`),导出 `paths`/`components`/`operations`。请求体、响应体、SSE 事件的字段以此为单一事实源,**不要手改**。
- `domain.ts` — 实体与枚举:`Role`、`DocumentStatus`、`IngestFailReason`、`MessageRole`,以及 `User`/`KnowledgeBase`/`DocumentMeta`/`Conversation`/`Message` 接口。
- `sse.ts` — SSE 事件契约:`meta {grounded}` / `token {delta}` / `done {conversationId}` / `error {message}` 及其联合类型。字段从 `api.ts` 取别名,不再手写。
- `streaming.ts` — 流式接口的**消费侧类型**,前端 hook 与后端 handler 共用:请求别名 `ChatRequest`、事件别名与 `SseEventMap`/`SseEventOf`、线格式 `SseWireFrame` 与编解码契约 `SseEventEncoder`/`SseEventParser`、以及 hook 的状态机 `ChatStreamState`/`UseChatStreamResult`。全部建立在 `api.ts` 之上,并有编译期断言守门,防止与 schema 漂移。

barrel(`../index.ts`)导出 `domain`、`streaming`(已含 SSE 事件别名)与 `utils`;`sse.ts` 保留为可按路径直接引入的兼容模块。

只放类型(`type`/`interface`),不放实现。字段命名与取值对齐 DDL 与 API 契约,不自造。
