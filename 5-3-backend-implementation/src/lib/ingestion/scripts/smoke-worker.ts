import { writeFile, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { users, knowledgeBases, documents, docChunks } from "../../db/schema.ts";
import { getDocument, deleteDocument } from "../../db/documents.ts";
import { registerConfiguredProviders } from "../../llm/register.ts";
import { processDocument, type IngestJob } from "../worker.ts";

/**
 * 队列层入库冒烟 —— 验证 worker.processDocument 委托 rag 后链路完好:
 *   落临时 txt → readFile → extractText → 委托 rag(chunk→火山 embed→写库→ready) → 删临时文件
 *   node --env-file=.env.local --experimental-strip-types src/lib/ingestion/scripts/smoke-worker.ts
 *
 * 真打 API、真写库,末尾删测试 document(级联 doc_chunks)+ kb + user,不留脏数据。
 * 两个场景:①正常 txt 应 ready 且临时文件被删;②过短文本(扫描件路径)应 failed。
 */

const SAMPLE = `pgvector 是 PostgreSQL 的向量检索扩展,把高维向量作为一等公民存进关系库。
传统关系库擅长精确匹配和范围查询,面对"语义相近"这类模糊检索无能为力。向量检索把文本编码成高维向量,用向量间距离度量语义相似度。

HNSW 是一种近似最近邻索引,通过分层可导航小世界图在召回率和查询速度间取得平衡。相比暴力扫描,它把检索复杂度从线性降到对数级别,代价是索引构建更慢、占用更多内存。

在这套知识问答系统里,文档先被切成小块,每块生成一个 1024 维向量写入 doc_chunks 表。用户提问时问题也被编码成向量,在单个知识库范围内做相似度检索,取回最相关的若干块作为回答依据。

供应商抽象层是系统能换厂商的关键:业务代码只依赖 lib/llm 接口,不直接引任何厂商 SDK。worker、rag、检索链路在换厂商时一行都不用动。`;

async function makeTempTxt(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "smoke-worker-"));
  const path = join(dir, "sample.txt");
  await writeFile(path, content, "utf8");
  return path;
}

/** 建最小依赖链 user → kb → document(pending),返回三者 id。 */
async function seed(): Promise<{ userId: number; kbId: number; docId: number }> {
  const [u] = await db
    .insert(users)
    .values({ email: `smoke-worker-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, passwordHash: "x", role: "user" })
    .returning();
  const [kb] = await db.insert(knowledgeBases).values({ name: "smoke-worker-kb" }).returning();
  const [doc] = await db
    .insert(documents)
    .values({ knowledgeBaseId: kb.id, uploadedBy: u.id, filename: "sample.txt", status: "pending" })
    .returning();
  return { userId: u.id, kbId: kb.id, docId: doc.id };
}

async function cleanup(ids: { userId: number; kbId: number; docId: number }): Promise<void> {
  await deleteDocument(ids.docId); // 级联清 doc_chunks
  await db.delete(knowledgeBases).where(eq(knowledgeBases.id, ids.kbId));
  await db.delete(users).where(eq(users.id, ids.userId));
}

async function chunkRowCount(docId: number): Promise<number> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(docChunks)
    .where(eq(docChunks.documentId, docId));
  return cnt;
}

async function main(): Promise<void> {
  registerConfiguredProviders();
  let failed = false;
  const check = (ok: boolean, msg: string): void => {
    console.log(`${ok ? "✓" : "✗"} ${msg}`);
    if (!ok) failed = true;
  };

  // ── 场景 1:正常 txt → ready，临时文件被删 ──────────────────────────────
  {
    console.log("\n[场景1] 正常 txt 入库");
    const ids = await seed();
    const tempPath = await makeTempTxt(SAMPLE);
    const job: IngestJob = {
      documentId: ids.docId,
      knowledgeBaseId: ids.kbId,
      tempFilePath: tempPath,
      mimeType: "text/plain",
    };
    try {
      const res = await processDocument(job);
      console.log("返回:", JSON.stringify(res));
      check(res.ok === true, "返回 ok=true");
      check(res.ok === true && res.chunks > 0, "chunks > 0");
      const after = await getDocument(ids.docId);
      check(after?.status === "ready", `status = ready(实际 ${after?.status})`);
      const rows = await chunkRowCount(ids.docId);
      check(res.ok === true && rows === res.chunks, `doc_chunks 行数=${rows} 与返回 chunks 吻合`);
      check(!existsSync(tempPath), "临时文件已被删");
    } finally {
      await cleanup(ids);
    }
  }

  // ── 场景 2:过短文本(扫描件路径)→ failed ─────────────────────────────
  {
    console.log("\n[场景2] 过短文本 → failed(扫描件判定)");
    const ids = await seed();
    const tempPath = await makeTempTxt("太短"); // < SCAN_TEXT_THRESHOLD
    const job: IngestJob = {
      documentId: ids.docId,
      knowledgeBaseId: ids.kbId,
      tempFilePath: tempPath,
      mimeType: "text/plain",
    };
    try {
      const res = await processDocument(job);
      console.log("返回:", JSON.stringify(res));
      check(res.ok === false, "返回 ok=false");
      const after = await getDocument(ids.docId);
      check(after?.status === "failed", `status = failed(实际 ${after?.status})`);
      check(!!after?.errorReason, `error_reason 非空(${after?.errorReason ?? "∅"})`);
      check(!existsSync(tempPath), "临时文件已被删");
      const rows = await chunkRowCount(ids.docId);
      check(rows === 0, `未写入空内容(doc_chunks 行数=${rows})`);
    } finally {
      await cleanup(ids);
    }
  }

  console.log(failed ? "\n结果: ✗ 有失败项" : "\n结果: ✓ 全部通过");
  await db.$client.end();
  if (failed) process.exit(1);
}

main().catch(async (err) => {
  console.error("worker 冒烟异常:", err);
  try { await db.$client.end(); } catch {}
  process.exit(1);
});
