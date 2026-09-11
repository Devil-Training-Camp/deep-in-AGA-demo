# `@kb/db` — 数据库客户端与迁移

PostgreSQL 14 + pgvector 的数据访问底座。用 `pg`(node-postgres)+ `pgvector` npm 包,不用 Prisma(不支持 `vector` 类型)、不用 Supabase、不引入 Redis 或任何新独立服务。

`@kb/web` 的 `lib/db` 再导出本包,不重复实现连接池。

## 目录

| 目录/文件 | 角色 |
|-----------|------|
| `src/client.ts` | `pg.Pool` 单例;连接串**只来自** `process.env.DATABASE_URL` |
| `src/migrate.ts` | 极简 migration runner,顺序执行 `migrations/*.sql` |
| `src/index.ts` | 对外导出 |
| `migrations/` | 原生 SQL 迁移脚本 |

## 红线

- 连接串绝不硬编码,只读环境变量。
- 查询禁用 `SELECT *`,参数化查询防注入。
- 向量插入与 `<=>` 检索走原生 SQL + `pgvector` 序列化;`embedding` 为 `vector(1024)` + HNSW 索引。
