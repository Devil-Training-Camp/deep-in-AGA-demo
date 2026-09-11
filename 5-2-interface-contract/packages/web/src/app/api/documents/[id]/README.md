# `documents/[id]/` — 单份文档

- `GET /api/documents/:id` — 轮询 `{ status, error_reason? }`。
- `DELETE /api/documents/:id` — 删文档及其 chunk。

详见父级 `documents/README.md`。

- `route.ts` — GET + DELETE Handler。
