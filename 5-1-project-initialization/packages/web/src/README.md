# `packages/web/src/` — 应用源码根

严格对齐 `architecture-design.md:388` 的 `src/{app, lib, config}` 三分结构。目录与架构文档模块边界一一对应,不引入文档里没有的分层。

| 目录 | 角色 |
|------|------|
| `app/` | Next.js App Router:前端页面 + `api/` 后端 Route Handler |
| `lib/` | 后端业务模块(db/auth/llm/rag/ingestion/session) |
| `config/` | 集中可调参数(`params.ts`) |

分工:`app/api/*` 只做鉴权、参数校验、编排;业务逻辑在 `lib/*`;可调参数在 `config/`;跨包共享类型来自 `@kb/shared`,数据访问底层来自 `@kb/db`。
