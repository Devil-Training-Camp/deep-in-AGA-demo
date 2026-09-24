import { readFile, unlink } from "node:fs/promises";
import PgBoss from "pg-boss";
import { extractText, UnsupportedFileTypeError, ExtractionError } from "./extract.ts";
import { processDocument as ingestText } from "../rag/process.ts";
import { updateDocumentStatus } from "../db/documents.ts";

/**
 * 文档入库后台 worker —— pg-boss 消费入库任务(决策 2 / 3),链路见时序图 §五.1。
 *
 * 职责分层(消重后):
 *   - 本文件是**队列层**:领取任务、读临时文件、解析(extractText)、用完删临时文件,
 *     耦合 pg-boss。
 *   - 「纯文本 → 入库」的编排(扫描件判定 → 分块 → embedding → 写 doc_chunks → 状态推进)
 *     统一委托给 lib/rag/process.ts 的 processDocument,worker 不再自己重复这段逻辑。
 *
 * 关键约束(CLAUDE.md):
 *   - 队列载荷只带**文件路径引用**,不带字节本体(不把 buffer 塞进队列)。
 *   - 临时文件由 worker 读取、用完即删(单长驻进程本地磁盘暂存,不进对象存储)。
 *   - worker 随应用一起 boss.start();进程重启后 pg-boss 自动恢复未完成任务。
 */

export const INGEST_QUEUE = "document-ingest";

/** 入库任务载荷:只有引用,没有字节。 */
export interface IngestJob {
  documentId: number;
  knowledgeBaseId: number;
  /** 服务端本地临时文件路径(上传接口落盘后传入)。 */
  tempFilePath: string;
  mimeType: string;
}

/**
 * 处理单份文档(队列层)。抽成纯函数便于单测。
 * 只做队列层独有的三件事:读临时文件、解析为纯文本、用完删文件;
 * 解析出的文本交给 rag.processDocument 完成后续入库,状态推进由它负责。
 * 出错时置 documents=failed 并吞掉异常(worker 不因单份失败而崩),返回处理结果。
 */
export async function processDocument(job: IngestJob): Promise<
  { ok: true; chunks: number } | { ok: false; reason: string }
> {
  const { documentId, knowledgeBaseId, tempFilePath, mimeType } = job;
  try {
    // 1. 读临时文件 → 2. 解析为纯文本(队列层独有职责)
    const buffer = await readFile(tempFilePath);
    let text: string;
    try {
      text = await extractText(buffer, mimeType);
    } catch (err) {
      // extract/readFile 阶段特有的错误分类(rag 层拿不到文件类型信息),由 worker 落 failed。
      let reason: string;
      if (err instanceof UnsupportedFileTypeError) reason = `不支持的文件类型: ${err.mimeType}`;
      else if (err instanceof ExtractionError) reason = "文档解析失败";
      else reason = "文档读取失败";
      console.error(`[ingest] documentId=${documentId} 解析失败:`, err);
      await safeSetFailed(documentId, reason);
      return { ok: false, reason };
    }

    // 3. 纯文本入库编排(扫描件判定/分块/embedding/写库/状态推进)统一委托 rag 层。
    //    rag.processDocument 内部失败时已自行置 failed + 精确 reason,这里不再二次覆盖。
    const { chunkCount } = await ingestText(documentId, knowledgeBaseId, text);
    return { ok: true, chunks: chunkCount };
  } catch (err) {
    // 只可能是 rag 层抛出的错(它已置好 failed + 精确 reason,worker 不再改 error_reason)。
    console.error(`[ingest] documentId=${documentId} 入库失败:`, err);
    return { ok: false, reason: err instanceof Error ? err.message : "入库处理失败" };
  } finally {
    // 临时文件用完即删,无论成败;删失败只告警不影响入库结论。
    try {
      await unlink(tempFilePath);
    } catch (unlinkErr) {
      const e = unlinkErr as NodeJS.ErrnoException;
      if (e.code !== "ENOENT") console.warn(`[ingest] 删除临时文件失败 ${tempFilePath}:`, e.message);
    }
  }
}

/** 置 failed 且不让「置状态本身失败」再抛出淹没原始错误。 */
async function safeSetFailed(documentId: number, reason: string): Promise<void> {
  try {
    await updateDocumentStatus(documentId, "failed", reason);
  } catch (statusErr) {
    console.error(`[ingest] documentId=${documentId} 置 failed 亦失败:`, statusErr);
  }
}

/**
 * 启动 worker:创建队列 + 注册消费者。随应用启动调用一次。
 * pg-boss v10 的 handler 收到的是一批 Job(数组),逐个独立处理,单份失败不影响同批其它。
 */
export async function startIngestionWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(INGEST_QUEUE);
  await boss.work<IngestJob>(INGEST_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await processDocument(job.data);
    }
  });
}

/** 供上传接口投递任务(载荷只带路径引用)。 */
export async function enqueueIngestion(boss: PgBoss, job: IngestJob): Promise<string | null> {
  return boss.send(INGEST_QUEUE, job);
}
