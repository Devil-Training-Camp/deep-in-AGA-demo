import { eq, sql, cosineDistance, desc } from "drizzle-orm";
import { db } from "./index.ts";
import { docChunks } from "./schema.ts";
import type { NewDocChunk } from "./types.ts";

/**
 * 文档分块 + 向量 CRUD。
 *
 * 检索红线:只在单个 knowledge_base_id 内(决策 3),绝不跨库。
 * 相似度用 Drizzle 内置 cosineDistance(<=>),配 HNSW 索引。
 */

/** worker 批量写入 chunk(解析→分块→embedding 后)。 */
export async function insertChunks(rows: NewDocChunk[]): Promise<number> {
  if (rows.length === 0) return 0;
  const inserted = await db.insert(docChunks).values(rows).returning({ id: docChunks.id });
  return inserted.length;
}

export interface RetrievedChunk {
  id: number;
  documentId: number;
  text: string;
  similarity: number; // 1 - cosineDistance,越大越相似
}

/**
 * 单库内向量检索 top-K。
 * @param knowledgeBaseId 只在此库内检索(强制单库,不跨库)
 * @param queryEmbedding  1024 维查询向量
 * @param topK            返回块数(RETRIEVAL_TOP_K)
 */
export async function searchChunks(
  knowledgeBaseId: number,
  queryEmbedding: number[],
  topK: number,
): Promise<RetrievedChunk[]> {
  // cosineDistance 是 Drizzle 对 pgvector `<=>` 操作符的封装。
  // `<=>` 计算两个向量的「余弦距离」= 1 − 余弦相似度,取值 [0, 2]:
  //   0   → 方向完全一致(最相关);1 → 正交;2 → 完全相反。
  // 距离越小越相关,故下面用 `1 - 距离` 换算回「相似度」(越大越相关)以便阈值判断,
  // 并按相似度降序取 top-K。HNSW 索引正是按此 `<=>` 距离建的,检索走索引。
  const distance = cosineDistance(docChunks.embedding, queryEmbedding);
  const similarity = sql<number>`1 - (${distance})`;
  return db
    .select({
      id: docChunks.id,
      documentId: docChunks.documentId,
      text: docChunks.text,
      similarity,
    })
    .from(docChunks)
    // 检索隔离靠 knowledge_base_id 单库过滤(本项目无 tenant_id;知识库全员共享,
    // 隔离维度是库而非租户 —— 见决策 3/6)。绝不跨库检索。
    .where(eq(docChunks.knowledgeBaseId, knowledgeBaseId))
    .orderBy(desc(similarity))
    .limit(topK);
}
