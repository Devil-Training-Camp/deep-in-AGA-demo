# `app/api/` — 后端 API Routes

Next.js App Router 的 Route Handler 目录,承载全部后端接口。每个子目录对应 `architecture-design.md` §四「API 接口契约」的一个分区,目录名即 URL 路径段。

## 约定

- 目录 = 路由:`app/api/chat/route.ts` → `POST /api/chat`;`[id]` 是动态段。
- 除 `auth/` 外,所有路由需 JWT 鉴权(`Authorization: Bearer <token>`)。
- 错误响应统一 `{ "error": { "code": string, "message": string } }`(`architecture-design.md:248`)。
- 授权分层是本目录最密集的越权风险区,统一在 `lib/db` 数据访问层处理,不在 Route Handler 里手写过滤(CLAUDE.md 三、安全 P0)。

## 子目录与端点

| 子目录 | 端点 | 归属 |
|--------|------|------|
| `auth/` | `POST /register`、`POST /login` | 决策 5 |
| `knowledge-bases/` | 列表/创建;`[id]` 删除;`[id]/documents` 上传+列表 | 决策 6、全员平权 |
| `documents/` | `[id]` 状态查询/删除 | 决策 2、全异步入库 |
| `chat/` | `POST /chat`,SSE 流式问答 | 决策 1 |
| `conversations/` | 列表;`[id]/messages` 消息列表 | 决策 7、历史私有 |
| `admin/` | `conversations` 全局只读审计 | 决策 8 |

只放 Route Handler(`route.ts`)。业务逻辑下沉到 `lib/*`,此层只做鉴权、参数校验、调用 `lib` 并组织响应。
