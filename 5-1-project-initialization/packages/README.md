# `packages/` — workspace 包目录

pnpm workspace(`pnpm-workspace.yaml: packages/*`)下的三个包:

| 包 | 角色 |
|----|------|
| `web` (`@kb/web`) | Next.js 应用:前端页面 + API Routes |
| `shared` (`@kb/shared`) | 共享类型与工具,被 web/db 引用 |
| `db` (`@kb/db`) | PG 客户端 + pgvector + 迁移 |

依赖方向:`web → shared`、`web → db`、`db → shared`。不新建 `packages` 之外的平行目录。
