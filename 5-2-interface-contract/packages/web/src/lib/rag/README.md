# `lib/rag/` — 检索管道

对应 `architecture-design.md:405`(时序图 2)、CLAUDE.md 模块边界 `lib/rag`。

## 放什么

- `index.ts` — 分块、向量检索、query rewriting 的实现。
- 分块:按 `CHUNK_SIZE`/`CHUNK_OVERLAP` 字符切分,优先在段落边界(`\n\n`)或句号处切。
- query rewriting:检索前先用小模型把追问改写成独立问题,再去检索(消解指代)。
- 向量检索:`embed(改写后问题)` → pgvector `ORDER BY <=>`,取 `RETRIEVAL_TOP_K`。

## 红线

- 检索只在单个 `knowledge_base_id` 内,**不跨库**。
- 最高相似度 < `GROUNDED_SIMILARITY_THRESHOLD` 判为未命中 → `grounded: false`,回答标明属常识推测,不伪装成文档依据。
- 分块参数改动需全量重新解析+embedding+重建索引,须在有数据入库前定稿。
