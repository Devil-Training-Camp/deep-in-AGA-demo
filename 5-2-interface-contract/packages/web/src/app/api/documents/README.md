# `app/api/documents/` — 文档状态查询与删除

对应 `architecture-design.md` §API 3、决策 2:全异步入库,前端提交后轮询状态。

上传入口不在这里,而在 `knowledge-bases/[id]/documents`(文档必须挂在某个知识库下)。本目录只处理已存在文档的单份操作。

## 端点

- `GET /api/documents/:id` — 轮询 `{ status, error_reason? }`;`status ∈ pending|processing|ready|failed`(`[id]/route.ts`)
- `DELETE /api/documents/:id` — 删文档及其 chunk(`[id]/route.ts`)

## 红线

- `failed` 时回显具体 `error_reason`(扫描件拦截、解析失败等),单份失败不影响其他文档。
- 删除属破坏性操作,记录操作者/时间/级联影响量。
