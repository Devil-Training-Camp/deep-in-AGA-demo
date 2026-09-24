import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { documents } from "./schema.ts";
import type { Document, DocumentStatus } from "./types.ts";

/**
 * 文档 CRUD —— 全异步入库,status 驱动前端轮询(决策 2)。
 *
 * 文档挂在知识库下、知识库全员共享,故读列表不拼 user 过滤。
 * uploaded_by 仅作审计留痕,不用于访问控制。
 * 禁 SELECT *(CLAUDE.md):显式列,避免将来加敏感列时外泄。
 */

const COLUMNS = {
  id: documents.id,
  knowledgeBaseId: documents.knowledgeBaseId,
  uploadedBy: documents.uploadedBy,
  filename: documents.filename,
  status: documents.status,
  errorReason: documents.errorReason,
  createdAt: documents.createdAt,
};

/** 上传即插入 pending 行,立即返回 { documentId, status }(异步入库入口)。 */
export async function createDocument(input: {
  knowledgeBaseId: number;
  uploadedBy: number;
  filename: string;
}): Promise<Document> {
  const rows = await db
    .insert(documents)
    .values({ ...input, status: "pending" })
    .returning();
  return rows[0];
}

export async function getDocument(id: number): Promise<Document | null> {
  const rows = await db.select(COLUMNS).from(documents).where(eq(documents.id, id)).limit(1);
  return rows[0] ?? null;
}

/** 列出某知识库下的文档及状态。 */
export async function listDocumentsByKnowledgeBase(
  knowledgeBaseId: number,
): Promise<Document[]> {
  return db
    .select(COLUMNS)
    .from(documents)
    .where(eq(documents.knowledgeBaseId, knowledgeBaseId))
    .orderBy(documents.createdAt);
}

/** worker 推进状态:pending → processing → ready/failed;failed 时带 error_reason。 */
export async function updateDocumentStatus(
  id: number,
  status: DocumentStatus,
  errorReason?: string,
): Promise<void> {
  await db
    .update(documents)
    .set({ status, errorReason: errorReason ?? null })
    .where(eq(documents.id, id));
}

/** 删除文档:ON DELETE CASCADE 清除其 doc_chunks,不留孤儿向量。 */
export async function deleteDocument(id: number): Promise<boolean> {
  const rows = await db
    .delete(documents)
    .where(eq(documents.id, id))
    .returning({ id: documents.id });
  return rows.length > 0;
}
