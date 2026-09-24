/**
 * searchChunks 只读逻辑冒烟测试 —— 验证向量检索这条路能端到端跑通。
 *
 * 用法:
 *   node --env-file=.env.local --experimental-strip-types src/lib/db/scripts/smoke-search.ts
 *
 * 说明(与提示的两点出入,先讲清):
 *   1. 函数名是 searchChunks,不是 searchSimilarChunks(项目里就这一个,不另造)。
 *   2. doc_chunks 有 NOT NULL 外键:knowledge_base_id → knowledge_bases、
 *      document_id → documents、documents.uploaded_by → users。所以不能孤立地
 *      往 chunks 插数据,必须先播一个 user + 知识库 + 文档,再插 chunk。
 *
 * 关于"语义相关"这件事要诚实:真正的 embedding 出自 lib/llm/embed(尚未实现),
 * 这里没有真模型,无法生成"语义上"正确的 1024 维向量。所以本脚本做的是**检索管路**
 * 的冒烟:用构造好的向量,让"查询向量"在方向上贴近某一主题、远离其它主题,借此验证
 *   - 余弦距离排序正确(最贴近的排最前),
 *   - 单库过滤生效(别的库的 chunk 不会被检出),
 *   - top-K 截断正确。
 * 它验证的是"这条链路接对了",不是"模型语义质量"——后者要等接上真 embed 后用评测样例测。
 *
 * 副作用与止损:会写入几行测试数据。全程包在一个事务里,跑完 ROLLBACK,不留残留。
 * 因此走 DATABASE_URL(可写),不是只读串。
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql, cosineDistance, desc } from "drizzle-orm";
import * as schema from "../schema.ts";
import { docChunks } from "../schema.ts";

const url = process.env.DATABASE_URL;
if (!url || !url.trim()) {
  console.error("✗ 未配置 DATABASE_URL。请在 .env.local 填入后重试。");
  process.exit(1);
}

const EMBED_DIM = 1024;
const TOP_K = 3;

/**
 * 造一个"主题向量":在 1024 维里只点亮某几个维度,不同主题点亮不相交的维度组,
 * 于是同主题向量余弦相似度高、跨主题近似正交。这是纯构造,不代表真实语义。
 * seed 用来在同主题内制造轻微差异,让排序有区分度。
 */
function topicVector(dims: number[], seed = 0): number[] {
  const v = new Array<number>(EMBED_DIM).fill(0);
  for (const d of dims) v[d] = 1;
  if (seed) v[dims[0]] += seed * 0.01; // 同主题内的微扰,制造可分辨的排名
  // L2 归一化(pgvector 余弦距离对模长不敏感,但归一化让数值更干净)
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

// 三个"主题",各占一组不相交维度。
const TOPIC_DB = [0, 1, 2]; // 数据库
const TOPIC_COOK = [100, 101, 102]; // 烹饪
const TOPIC_ASTRO = [200, 201, 202]; // 天文

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

let pass = true;
const mark = (ok: boolean) => {
  if (!ok) pass = false;
  return ok ? "✓" : "✗";
};

async function main() {
  console.log("=== searchChunks 冒烟测试(事务内,跑完回滚)===\n");

  await db.transaction(async (tx) => {
    // ── 播种:user → 两个知识库 → 各一篇文档 ──────────────
    const [user] = await tx
      .insert(schema.users)
      .values({ email: `smoke+${Date.now()}@example.test` })
      .returning({ id: schema.users.id });

    const [kbA] = await tx
      .insert(schema.knowledgeBases)
      .values({ name: "smoke-kb-A" })
      .returning({ id: schema.knowledgeBases.id });
    const [kbB] = await tx
      .insert(schema.knowledgeBases)
      .values({ name: "smoke-kb-B" })
      .returning({ id: schema.knowledgeBases.id });

    const [docA] = await tx
      .insert(schema.documents)
      .values({ knowledgeBaseId: kbA.id, uploadedBy: user.id, filename: "a.txt", status: "ready" })
      .returning({ id: schema.documents.id });
    const [docB] = await tx
      .insert(schema.documents)
      .values({ knowledgeBaseId: kbB.id, uploadedBy: user.id, filename: "b.txt", status: "ready" })
      .returning({ id: schema.documents.id });

    // ── 播种 chunk:A 库放三个主题各一条;B 库放一条"数据库"主题(用于验证不跨库)──
    await tx.insert(docChunks).values([
      {
        knowledgeBaseId: kbA.id,
        documentId: docA.id,
        text: "PostgreSQL 用 B-tree 和 GIN 索引加速查询,pgvector 提供向量检索。",
        embedding: topicVector(TOPIC_DB, 1),
      },
      {
        knowledgeBaseId: kbA.id,
        documentId: docA.id,
        text: "煎牛排前先把锅烧到冒烟,两面各煎一分钟锁住肉汁。",
        embedding: topicVector(TOPIC_COOK),
      },
      {
        knowledgeBaseId: kbA.id,
        documentId: docA.id,
        text: "木星是太阳系最大的行星,大红斑是一个持续数百年的风暴。",
        embedding: topicVector(TOPIC_ASTRO),
      },
      {
        // 同为"数据库"主题,但在 B 库 —— 正确实现绝不能把它检出来
        knowledgeBaseId: kbB.id,
        documentId: docB.id,
        text: "MySQL 的 InnoDB 引擎支持行级锁和事务。(应被单库过滤挡在 A 库检索之外)",
        embedding: topicVector(TOPIC_DB, 2),
      },
    ]);

    // ── 查询:一个"数据库"主题的问题向量,只在 A 库里检索 ──
    // searchChunks 用 db(全局连接);为了让写入在事务内可见并随后回滚,
    // 这里直接用 tx 复刻其检索逻辑,保证与 doc-chunks.ts 语义一致。
    const queryEmbedding = topicVector(TOPIC_DB);
    const distance = cosineDistance(docChunks.embedding, queryEmbedding);
    const similarity = sql<number>`1 - (${distance})`;
    const results = await tx
      .select({
        id: docChunks.id,
        documentId: docChunks.documentId,
        text: docChunks.text,
        similarity,
      })
      .from(docChunks)
      .where(eq(docChunks.knowledgeBaseId, kbA.id))
      .orderBy(desc(similarity))
      .limit(TOP_K);

    // ── 打印 ──────────────────────────────────────────────
    console.log(`查询主题:数据库;在知识库 A(id=${kbA.id})内检索 top-${TOP_K}\n`);
    results.forEach((r, i) => {
      console.log(`  #${i + 1}  similarity=${r.similarity.toFixed(4)}`);
      console.log(`      ${r.text}`);
    });
    console.log();

    // ── 断言 ──────────────────────────────────────────────
    console.log("检查:");
    const top = results[0];
    const topIsDb = !!top && top.text.includes("PostgreSQL");
    console.log(`  ${mark(topIsDb)} 排名第一是「数据库」主题的片段(语义最相关的排最前)`);

    const noCrossKb = results.every((r) => !r.text.includes("MySQL"));
    console.log(`  ${mark(noCrossKb)} B 库的「数据库」片段未被检出(单库过滤生效,不跨库)`);

    const monotonic = results.every(
      (r, i) => i === 0 || results[i - 1].similarity >= r.similarity,
    );
    console.log(`  ${mark(monotonic)} 结果按相似度降序排列`);

    const withinTopK = results.length <= TOP_K;
    console.log(`  ${mark(withinTopK)} 返回条数 ≤ top-K(${results.length} ≤ ${TOP_K})`);

    console.log();
    // 无论通过与否都回滚:测试数据不落库。
    throw new ROLLBACK_SENTINEL();
  }).catch((e) => {
    if (!(e instanceof ROLLBACK_SENTINEL)) throw e;
    console.log("(事务已回滚,测试数据未落库)\n");
  });

  console.log(pass ? "=== 全部通过 ✓ ===" : "=== 存在未通过项 ✗ ===");
}

// 用一个专用异常触发 ROLLBACK —— 断言全跑完后主动抛出,drizzle 会回滚整个事务。
class ROLLBACK_SENTINEL extends Error {}

main()
  .catch((err) => {
    console.error("冒烟测试失败:", err?.message ?? err);
    pass = false;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
    process.exit(pass ? 0 : 1);
  });
