# `src/types/` — 领域类型与契约

`@kb/shared` 的类型定义,web/db 共享。来源是 `architecture-design.md` 的 DDL(§三)、API 契约(§四)与 CLAUDE.md 的行为约束。

## 放什么

- `domain.ts` — 实体与枚举:`Role`、`DocumentStatus`、`IngestFailReason`、`MessageRole`,以及 `User`/`KnowledgeBase`/`DocumentMeta`/`Conversation`/`Message` 接口。
- `sse.ts` — SSE 事件契约:`meta {grounded}` / `token` / `done` / `error` 及其联合类型。

只放类型(`type`/`interface`),不放实现。字段命名与取值对齐 DDL 与 API 契约,不自造。
