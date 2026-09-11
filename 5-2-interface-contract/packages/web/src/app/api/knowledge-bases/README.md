# `app/api/knowledge-bases/` — 知识库(全员平权)

对应 `architecture-design.md` §API 2、决策 6:知识库无 owner,任何登录用户可建/看/用/删。

## 端点

- `GET /api/knowledge-bases` — 列出全部知识库(`route.ts`)
- `POST /api/knowledge-bases` — `{ name }` 创建(`route.ts`)
- `DELETE /api/knowledge-bases/:id` — 删除,级联删文档与 chunk(`[id]/route.ts`)
- `POST /api/knowledge-bases/:id/documents` — 上传文件,立即返回 `{ documentId, status: "pending" }`(`[id]/documents/route.ts`)
- `GET /api/knowledge-bases/:id/documents` — 列出库内文档及状态(`[id]/documents/route.ts`)

## 红线

- **全员平权:此分区刻意不拼 user 过滤**——三条相反授权规则之一,别错拼成私有(CLAUDE.md P0)。
- 检索只在单个 `knowledge_base_id` 内,不跨库。
- 删除属破坏性操作,服务端记录操作者/时间/级联影响量;前端二次确认不构成后端防护。
- 上传字节暂存服务端本地临时目录,pg-boss 载荷只带路径引用,不塞 buffer。
