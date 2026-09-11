# `src/` — @kb/db 源码

| 文件 | 角色 |
|------|------|
| `client.ts` | `pg.Pool` 单例、`query`/`getPool`/`getClient`/`closePool`;连接串只来自 `DATABASE_URL` |
| `migrate.ts` | 极简 migration runner,执行 `../migrations/*.sql` |
| `index.ts` | 对外导出 |

只放数据库访问底层能力。业务层的授权过滤规则在 `@kb/web` 的 `lib/db` 组装,本包保持中立。
