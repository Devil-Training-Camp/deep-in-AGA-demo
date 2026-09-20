import { copyFile, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { users, knowledgeBases, documents, docChunks } from "../../db/schema.ts";
import { getDocument, deleteDocument } from "../../db/documents.ts";
import { registerConfiguredProviders } from "../../llm/register.ts";
import { processDocument, type IngestJob } from "../worker.ts";
import { EMBEDDING_DIM } from "../../llm/index.ts";

/**
 * PDF 端到端验证 —— 用一个真实的小 PDF 跑完整入库链路,验证 processDocument。
 *   node --env-file=.env.local --experimental-strip-types \
 *     src/lib/ingestion/scripts/verify-pdf.ts [pdf路径]
 *
 * 默认样本:tmp/sample.pdf(W3C/css4.pub 开放许可教材节选,已 gitignore)。
 *
 * 说明:入口用 worker.processDocument(job) 而非 rag.processDocument ——
 *   rag 那个只吃纯文本、不解析 PDF;PDF→文本(pdf-parse)是 extract + worker 的职责。
 *   要「拿 PDF 验证」就必须走 worker 这条:readFile → extractText → 委托 rag。
 *
 * worker 处理完会在 finally 里删掉传入的临时文件(生产里就是清理暂存)。为不误删
 * 样本,这里先把样本拷成一份一次性临时文件传进去,让 worker 删拷贝、留原样本。
 *
 * 真打火山 API、真写库,末尾删测试 document(级联 doc_chunks)+ kb + user,不留脏数据。
 */

// 默认样本相对项目根定位(脚本在 src/lib/ingestion/scripts/ 下,回退 5 级到根)。
const DEFAULT_PDF = join(fileURLToPath(new URL("../../../../", import.meta.url)), "tmp", "sample.pdf");

async function main(): Promise<void> {
  const pdfPath = process.argv[2] ?? DEFAULT_PDF;
  if (!existsSync(pdfPath)) {
    console.error(`✗ 找不到 PDF: ${pdfPath}`);
    console.error("  先下载一个开放 PDF 到 tmp/sample.pdf,或把路径作为参数传入。");
    process.exit(1);
  }
  console.log(`使用 PDF: ${pdfPath}\n`);

  registerConfiguredProviders();

  // 建最小依赖链:user → knowledge_base → document(pending)。
  const [u] = await db
    .insert(users)
    .values({ email: `verify-pdf-${Date.now()}@example.com`, passwordHash: "x", role: "user" })
    .returning();
  const [kb] = await db.insert(knowledgeBases).values({ name: "verify-pdf-kb" }).returning();
  const [doc] = await db
    .insert(documents)
    .values({ knowledgeBaseId: kb.id, uploadedBy: u.id, filename: "sample.pdf", status: "pending" })
    .returning();
  console.log(`建测试数据: user=${u.id} kb=${kb.id} doc=${doc.id}`);

  // 把样本拷成一次性临时文件(worker 会删它,不能让它删原样本)。
  const dir = await mkdtemp(join(tmpdir(), "verify-pdf-"));
  const tempCopy = join(dir, "upload.pdf");
  await copyFile(pdfPath, tempCopy);

  let failed = false;
  const check = (ok: boolean, msg: string): void => {
    console.log(`${ok ? "✓" : "✗"} ${msg}`);
    if (!ok) failed = true;
  };

  try {
    const job: IngestJob = {
      documentId: doc.id,
      knowledgeBaseId: kb.id,
      tempFilePath: tempCopy,
      mimeType: "application/pdf",
    };
    const res = await processDocument(job);

    // ① 打印返回的 documentId 和 chunkCount。
    // worker 返回形状是 {ok, chunks};documentId 即传入的 doc.id(入库编排不改它)。
    console.log("\n=== processDocument 返回 ===");
    console.log(JSON.stringify(res));
    if (res.ok) {
      console.log(`documentId = ${doc.id}`);
      console.log(`chunkCount = ${res.chunks}`);
    }
    check(res.ok === true, "处理成功(ok=true)");
    check(res.ok === true && res.chunks > 0, "chunkCount > 0");

    const after = await getDocument(doc.id);
    check(after?.status === "ready", `documents.status = ready(实际 ${after?.status})`);

    // ② 查库确认 chunks 表有对应行。
    const rows = await db
      .select({
        id: docChunks.id,
        dim: sql<number>`vector_dims(${docChunks.embedding})`,
        // embedding 是否为 NULL(embedding 列不为空的核心断言)。
        isNull: sql<boolean>`${docChunks.embedding} is null`,
      })
      .from(docChunks)
      .where(eq(docChunks.documentId, doc.id));

    console.log("\n=== doc_chunks 查询 ===");
    console.log(`doc_chunks 中 documentId=${doc.id} 的行数: ${rows.length}`);
    check(rows.length > 0, "chunks 表有对应行");
    check(res.ok === true && rows.length === res.chunks, "行数与返回 chunkCount 吻合");

    // ③ embedding 列不为空(且维度对上 1024)。
    const anyNull = rows.some((r) => r.isNull);
    check(!anyNull, "所有行的 embedding 列均不为空(非 NULL)");
    const allDim = rows.every((r) => r.dim === EMBEDDING_DIM);
    check(allDim, `所有 embedding 维度均为 ${EMBEDDING_DIM}(实际 ${[...new Set(rows.map((r) => r.dim))].join(",")})`);
  } finally {
    // 清理:删 document 级联清 doc_chunks;再删 kb / user。tempCopy 已被 worker 删。
    await deleteDocument(doc.id);
    await db.delete(knowledgeBases).where(eq(knowledgeBases.id, kb.id));
    await db.delete(users).where(eq(users.id, u.id));
    console.log("\n已清理测试数据");
  }

  console.log(failed ? "\n结果: ✗ 有失败项" : "\n结果: ✓ 全部通过");
  await db.$client.end();
  if (failed) process.exit(1);
}

main().catch(async (err) => {
  console.error("PDF 验证异常:", err);
  try { await db.$client.end(); } catch {}
  process.exit(1);
});
