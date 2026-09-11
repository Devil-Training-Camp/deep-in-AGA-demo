# `lib/` — 后端业务模块

对应 `architecture-design.md:401`。API Routes(`app/api/*`)是薄薄的鉴权+编排层,真正的业务逻辑都在这里。每个子目录是一个有明确职责红线、不可越界的模块(CLAUDE.md 二、模块边界)。

| 子目录 | 职责 |
|--------|------|
| `db/` | PG 连接、迁移、pgvector 查询。委托给 `@kb/db`,本地只做再导出/适配 |
| `auth/` | JWT 签发/校验、密码哈希 |
| `llm/` | 厂商抽象层:`streamChat` / `rewrite` / `embed`,返回 1024 维 |
| `rag/` | 分块、向量检索、query rewriting |
| `ingestion/` | 解析、扫描件阈值判定、pg-boss worker |
| `session/` | 进程内会话内存 + 过期清理 |

不要在此之外新增分层——目录与架构文档模块边界一一对应。跨模块协作走各自导出的接口,不互相掏内部实现。
