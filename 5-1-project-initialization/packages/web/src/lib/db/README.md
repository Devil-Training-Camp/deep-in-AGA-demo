# `lib/db/` — 数据访问层(web 侧)

对应 `architecture-design.md:402`、CLAUDE.md 模块边界 `lib/db`。

PG 连接、迁移、pgvector 查询的底层实现在 `@kb/db` 包里,本目录只做**再导出与 web 侧适配**,不重复实现连接池。

## 放什么

- `index.ts` — 再导出 `@kb/db` 的 `query`/`getPool` 等。
- 后续:承载「三条相反授权规则」的数据访问封装——知识库不拼 user 过滤、历史强制拼 `user_id`、admin 路径刻意不拼,**统一在这一层处理,不在 Route Handler 里手写**。

## 红线

- 查询禁用 `SELECT *`,显式列出字段;响应/日志绝不含 `password_hash`。
- 连接串只来自服务端环境变量(`DATABASE_URL`),绝不硬编码、绝不进前端 bundle。
- 向量插入与 `<=>` 检索走 `$queryRaw` 风格的原生 SQL + `pgvector` 包(Prisma 不支持 `vector`)。
