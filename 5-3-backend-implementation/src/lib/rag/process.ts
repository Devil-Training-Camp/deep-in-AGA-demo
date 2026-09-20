import { chunkDocument } from "./chunk.ts";
import { generateEmbeddings } from "./embed.ts";
import { insertChunks } from "../db/doc-chunks.ts";
import { updateDocumentStatus } from "../db/documents.ts";
import { SCAN_TEXT_THRESHOLD } from "../../config/params.ts";
import type { NewDocChunk } from "../db/types.ts";

/**
 * 文档入库编排(纯文本入口)—— 串 chunk → embed → 写 doc_chunks → 改状态,不依赖队列。
 *
 * 与 lib/ingestion/worker.ts 的分工:
 *   - worker.processDocument 是**队列层**:读 job.data(路径引用)、readFile、extractText、
 *     用完删临时文件,耦合 pg-boss。
 *   - 本函数是队列层之下的**纯逻辑编排**:已经拿到纯文本,只管「文本 → 入库」,
 *     不碰文件系统、不碰队列,便于单测与直接调用。
 *
 * 关于请求里的次序:原始要求写「extractText → 创建 document(processing)」,但——
 *   1) extractText 的输入是文件字节 + MIME,不是纯文本,不属于本(纯文本)入口;
 *      解析仍归 ingestion 层。本函数只接已抽取好的文本。
 *   2) createDocument 建的是 status=pending 且不吃正文,documentId 必须先有才能后续写 chunk。
 *   因此这里约定:**document 记录由上游先建好、传入 documentId**;本函数把它推进到
 *   processing,处理成功置 ready、失败置 failed + error_reason。
 *
 * @returns { documentId, chunkCount } —— 成功入库的块数
 * @throws 处理失败时:已把 document 置 failed,再抛出让调用方感知
 */
export async function processDocument(
  documentId: number,
  knowledgeBaseId: number,
  text: string,
): Promise<{ documentId: number; chunkCount: number }> {
  const t0 = Date.now();
  const step = (label: string, since: number): void => {
    console.log(`[process] doc=${documentId} ${label} 耗时 ${Date.now() - since}ms`);
  };

  try {
    await updateDocumentStatus(documentId, "processing");

    // 1. 扫描件阈值判定:文本过少判为扫描件/图片型,不入库空内容(决策 10)。
    if (text.trim().length < SCAN_TEXT_THRESHOLD) {
      const reason = "无可提取文字(疑似扫描件或图片型文档,本期不支持 OCR)";
      await updateDocumentStatus(documentId, "failed", reason);
      throw new Error(reason);
    }

    // 2. 分块(决策 11 字符数策略)
    let since = Date.now();
    const chunks = chunkDocument(text);
    step(`分块 → ${chunks.length} 块`, since);
    if (chunks.length === 0) {
      const reason = "分块结果为空";
      await updateDocumentStatus(documentId, "failed", reason);
      throw new Error(reason);
    }

    // 3. 批量 embedding(火山 1024 维,走 lib/llm 抽象层;分批 + 单批重试)
    since = Date.now();
    const embeddings = await generateEmbeddings(chunks);
    step(`embedding → ${embeddings.length} 向量`, since);

    // 4. 批量写 doc_chunks(带 knowledge_base_id / document_id,检索靠库级过滤)
    since = Date.now();
    const rows: NewDocChunk[] = chunks.map((piece, i) => ({
      knowledgeBaseId,
      documentId,
      text: piece,
      embedding: embeddings[i],
    }));
    const inserted = await insertChunks(rows);
    step(`写库 → ${inserted} 行`, since);

    // 5. 置 ready
    await updateDocumentStatus(documentId, "ready");
    console.log(`[process] doc=${documentId} 完成,总耗时 ${Date.now() - t0}ms,入库 ${inserted} 块`);
    return { documentId, chunkCount: inserted };
  } catch (err) {
    // 完整错误进服务端日志(不含 messages.content 之类敏感正文);已在具体分支置过 failed 的
    // 直接复用其 reason,未置过的(如 embed/写库抛错)在此兜底置 failed。
    console.error(`[process] doc=${documentId} 处理失败:`, err);
    try {
      await updateDocumentStatus(
        documentId,
        "failed",
        err instanceof Error ? shortReason(err.message) : "入库处理失败",
      );
    } catch (statusErr) {
      console.error(`[process] doc=${documentId} 置 failed 亦失败:`, statusErr);
    }
    throw err;
  }
}

/** 把可能很长/含内部细节的错误压成简短的用户可见 reason(不外泄堆栈)。 */
function shortReason(msg: string): string {
  const trimmed = msg.trim();
  return trimmed.length > 120 ? trimmed.slice(0, 117) + "…" : trimmed;
}
