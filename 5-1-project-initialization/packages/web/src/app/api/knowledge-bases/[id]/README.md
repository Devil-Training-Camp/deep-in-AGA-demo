# `knowledge-bases/[id]/` — 单个知识库

`DELETE /api/knowledge-bases/:id`:删除知识库,级联删 `documents` 与 `doc_chunks`。

全员平权,此路径刻意不拼 user 过滤;破坏性操作须记录操作者/时间/级联影响量。详见父级 `knowledge-bases/README.md`。

- `route.ts` — DELETE Handler。
- `documents/` — 库内文档上传+列表(`POST`/`GET /api/knowledge-bases/:id/documents`)。
