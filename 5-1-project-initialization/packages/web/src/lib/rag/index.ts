// 分块、向量检索、query rewriting(CLAUDE.md 模块边界)。
// 检索前先用小模型把追问改写成独立问题再检索;检索只在单个 knowledge_base_id 内,不跨库。
export {};
