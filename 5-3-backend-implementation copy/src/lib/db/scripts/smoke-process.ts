import { db } from "../index.ts";
import { users, knowledgeBases, documents } from "../schema.ts";
import { registerConfiguredProviders } from "../../llm/register.ts";
import { processDocument } from "../../rag/process.ts";
import { getDocument, deleteDocument } from "../documents.ts";
import { eq, sql } from "drizzle-orm";
import { docChunks } from "../schema.ts";

/**
 * 入库编排端到端冒烟 —— 真跑 chunk → 火山 embed → 写 doc_chunks → status=ready。
 *   node --env-file=.env.local --experimental-strip-types src/lib/db/scripts/smoke-process.ts
 *
 * 打真 API、真写库,末尾删除测试 document(级联清 doc_chunks),不留脏数据。
 */

// 一段多段落长文本(> CHUNK_SIZE 500 字符,能切出多块,验证分块+批量 embedding)。
const SAMPLE = `pgvector 是 PostgreSQL 的向量检索扩展,它把高维向量作为一等公民存进关系库。
传统关系库擅长精确匹配和范围查询,但面对"语义相近"这类模糊检索无能为力。向量检索的思路是把文本编码成高维向量,用向量间的距离度量语义相似度。

HNSW 是一种近似最近邻索引,通过分层的可导航小世界图,在召回率和查询速度之间取得平衡。相比暴力扫描,它把检索复杂度从线性降到对数级别,代价是索引构建更慢、占用更多内存。

在这个知识问答系统里,文档先被切成小块,每块生成一个 1024 维向量写入 doc_chunks 表。用户提问时,问题也被编码成向量,在单个知识库范围内做相似度检索,取回最相关的若干块作为回答依据。

分块策略直接影响检索质量:块太大则一块里混入多个主题、稀释相似度;块太小则语义不完整、检索到的片段缺上下文。重叠是为了防止关键句正好被切在块边界上而两块都不完整。

供应商抽象层是这套系统能换厂商的关键:业务代码只依赖 lib/llm 的接口,不直接引任何厂商 SDK。今天 embedding 走火山的多模态接口、生成走火山的对话模型,明天要换成自托管的 BGE-M3 或别的云服务,只需替换 lib/llm 下的实现文件和注册入口,worker、rag、检索链路一行都不用动。这种边界隔离在早期看似多写了一层间接,但一旦真的发生厂商迁移,省下的返工远超这点成本。

异步入库是另一条重要约束:上传接口立即返回 pending,解析、分块、embedding、写库全部丢到后台 worker,前端靠轮询 documents.status 感知进度。这样上传不会因为大文档解析慢而长时间阻塞,用户体验更平滑,后台失败也能通过 status=failed 加 error_reason 精确反馈到具体哪一份文档、卡在哪一步。`;

async function main(): Promise<void> {
  registerConfiguredProviders();

  // 建最小依赖链:user → knowledge_base → document(satisfy NOT NULL FKs)。
  const [u] = await db
    .insert(users)
    .values({ email: `smoke-process-${Date.now()}@example.com`, passwordHash: "x", role: "user" })
    .returning();
  const [kb] = await db
    .insert(knowledgeBases)
    .values({ name: "smoke-process-kb" })
    .returning();
  const [doc] = await db
    .insert(documents)
    .values({ knowledgeBaseId: kb.id, uploadedBy: u.id, filename: "smoke.txt", status: "pending" })
    .returning();

  let failed = false;
  try {
    console.log(`建测试数据: user=${u.id} kb=${kb.id} doc=${doc.id}\n`);

    const res = await processDocument(doc.id, kb.id, SAMPLE);
    console.log("\n返回:", JSON.stringify(res));

    // 断言 1: 返回 chunkCount > 0
    if (res.chunkCount <= 0) { console.error("✗ chunkCount 应 > 0"); failed = true; }
    else console.log(`✓ chunkCount = ${res.chunkCount}`);

    // 断言 2: status = ready
    const after = await getDocument(doc.id);
    if (after?.status === "ready") console.log("✓ status = ready");
    else { console.error(`✗ status = ${after?.status},期望 ready`); failed = true; }

    // 断言 3: doc_chunks 实际行数 = chunkCount
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(docChunks)
      .where(eq(docChunks.documentId, doc.id));
    if (cnt === res.chunkCount) console.log(`✓ doc_chunks 实际行数 = ${cnt}`);
    else { console.error(`✗ doc_chunks 行数 ${cnt} ≠ chunkCount ${res.chunkCount}`); failed = true; }
  } finally {
    // 清理:删 document 级联清 doc_chunks;再删 kb / user。
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
  console.error("端到端冒烟异常:", err);
  try { await db.$client.end(); } catch {}
  process.exit(1);
});
