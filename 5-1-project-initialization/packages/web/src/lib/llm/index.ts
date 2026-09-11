import type { Message } from "@kb/shared";

// 厂商抽象层(architecture-design.md §供应商抽象层)。具体 LLM/Embedding 厂商未定,
// 业务代码只依赖以下接口,不直接引任何厂商 SDK;换厂商只替换实现,业务不动。

export interface LLMProvider {
  /** 流式生成回答;signal 用于中断止损,透传取消上游 fetch 停止计费。 */
  streamChat(messages: Message[], signal: AbortSignal): AsyncIterable<string>;
  /** query rewriting:结合历史把追问改写成独立问题,再去检索。 */
  rewrite(history: Message[], question: string): Promise<string>;
}

export interface EmbeddingProvider {
  /** 返回 1024 维向量(CLAUDE.md:Embedding 固定 1024 维,走 pgvector vector(1024))。 */
  embed(texts: string[]): Promise<number[][]>;
}
