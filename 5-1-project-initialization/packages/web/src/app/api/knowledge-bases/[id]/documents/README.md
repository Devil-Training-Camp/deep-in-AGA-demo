# `knowledge-bases/[id]/documents/` — 库内文档

- `POST /api/knowledge-bases/:id/documents` — 上传文件,立即返回 `{ documentId, status: "pending" }`,解析/embedding 丢后台。
- `GET /api/knowledge-bases/:id/documents` — 列出库内文档及 status。

上传字节暂存服务端本地临时目录,pg-boss 载荷只带路径引用。详见 `knowledge-bases/README.md`。

- `route.ts` — GET + POST Handler。
