/**
 * 只读数据库探测脚本 —— 校验迁移 0000_init.sql 是否按架构落地。
 *
 * 用法:
 *   node --env-file=.env.local --experimental-strip-types src/lib/db/scripts/probe.ts
 *
 * 约束:
 *   - 走 DATABASE_URL_READONLY(只读连接串),不用可写的 DATABASE_URL。
 *   - 全程只 SELECT / 查系统目录(information_schema、pg_*),无任何写操作(无 CREATE/INSERT/UPDATE/DELETE/DDL)。
 *   - 逐项打印检查结果:实际值 vs 期望值。
 *
 * 探测目标以 doc/architecture-design.md §三 + CLAUDE.md 为准:
 *   - 表名为 doc_chunks(不是 chunks);业务表 knowledge_bases / documents / doc_chunks。
 *   - embedding 列类型 vector、维度 1024(不是 1536)。
 *   - HNSW 索引建在 doc_chunks.embedding 上。
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL_READONLY;
if (!url || !url.trim()) {
  console.error("✗ 未配置 DATABASE_URL_READONLY(只读连接串)。请在 .env.local 填入后重试。");
  process.exit(1);
}

// 期望值集中一处,便于将来维度/表名调整时对照。
const EXPECTED_TABLES = ["knowledge_bases", "documents", "doc_chunks"] as const;
const EXPECTED_VECTOR_COLUMN = "embedding";
const EXPECTED_VECTOR_TYPE = "vector";
const EXPECTED_VECTOR_DIM = 1024;

// 只读驱动:关闭 prepare 以兼容 pooler;不开事务、不做任何写。
const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 5 });

let allPass = true;
const mark = (ok: boolean) => {
  if (!ok) allPass = false;
  return ok ? "✓" : "✗";
};

async function main() {
  console.log("=== 只读数据库探测(DATABASE_URL_READONLY)===\n");

  // ── 检查 1:三张表是否存在 ────────────────────────────
  console.log("[1] 业务表是否存在");
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ${sql(EXPECTED_TABLES as unknown as string[])}
  `;
  const found = new Set(tables.map((r) => r.table_name));
  for (const t of EXPECTED_TABLES) {
    const ok = found.has(t);
    console.log(`  ${mark(ok)} ${t}: ${ok ? "存在" : "缺失"}`);
  }
  console.log();

  // ── 检查 2:embedding 列类型与维度 ───────────────────
  // 注:提示原文写的是 chunks + 1536;实际按架构探测 doc_chunks + 1024,并打印实际维度对照。
  console.log("[2] doc_chunks.embedding 列类型与维度");
  const col = await sql<{ data_type: string; udt_name: string }[]>`
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doc_chunks'
      AND column_name = ${EXPECTED_VECTOR_COLUMN}
  `;
  if (col.length === 0) {
    console.log(`  ${mark(false)} 未找到 doc_chunks.${EXPECTED_VECTOR_COLUMN} 列`);
  } else {
    // udt_name 对 pgvector 列返回 'vector';维度需从 pg_attribute.atttypmod 读。
    const typeOk = col[0].udt_name === EXPECTED_VECTOR_TYPE;
    console.log(
      `  ${mark(typeOk)} 类型: 实际 udt_name='${col[0].udt_name}' / 期望 '${EXPECTED_VECTOR_TYPE}'`,
    );
    const dim = await sql<{ dimensions: number | null }[]>`
      SELECT
        CASE WHEN a.atttypmod > 0 THEN a.atttypmod ELSE NULL END AS dimensions
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'doc_chunks'
        AND a.attname = ${EXPECTED_VECTOR_COLUMN}
        AND a.attnum > 0
    `;
    const actualDim = dim[0]?.dimensions ?? null;
    const dimOk = actualDim === EXPECTED_VECTOR_DIM;
    console.log(
      `  ${mark(dimOk)} 维度: 实际 ${actualDim ?? "未知"} / 期望 ${EXPECTED_VECTOR_DIM}`,
    );
  }
  console.log();

  // ── 检查 3:HNSW 索引是否建在 embedding 列上 ──────────
  console.log("[3] doc_chunks.embedding 上的 HNSW 索引");
  const idx = await sql<{ indexname: string; indexdef: string; am: string }[]>`
    SELECT i.relname AS indexname,
           pg_get_indexdef(i.oid) AS indexdef,
           am.amname AS am
    FROM pg_index x
    JOIN pg_class i   ON i.oid = x.indexrelid
    JOIN pg_class t   ON t.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_am am     ON am.oid = i.relam
    WHERE n.nspname = 'public'
      AND t.relname = 'doc_chunks'
      AND am.amname = 'hnsw'
  `;
  const hnswOnEmbedding = idx.filter((r) =>
    r.indexdef.toLowerCase().includes(EXPECTED_VECTOR_COLUMN),
  );
  const idxOk = hnswOnEmbedding.length > 0;
  console.log(`  ${mark(idxOk)} HNSW 索引: ${idxOk ? "存在" : "缺失"}`);
  for (const r of hnswOnEmbedding) {
    console.log(`      - ${r.indexname}`);
    console.log(`        ${r.indexdef}`);
  }
  console.log();

  console.log(allPass ? "=== 全部通过 ✓ ===" : "=== 存在未通过项 ✗ ===");
}

main()
  .catch((err) => {
    console.error("探测失败:", err?.message ?? err);
    allPass = false;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
    process.exit(allPass ? 0 : 1);
  });
