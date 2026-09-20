import { registerConfiguredProviders } from "../register.ts";
import { getEmbeddingProvider, getLLMProvider, EMBEDDING_DIM } from "../index.ts";

/**
 * 真实厂商冒烟测试 —— 打真 API,不 mock。
 *   node --env-file=.env.local --experimental-strip-types src/lib/llm/scripts/smoke-providers.ts
 *
 * 验三件事,从硬到软:
 *   1) embed() 返回正好 EMBEDDING_DIM(1024)维 —— 对不上会炸 doc_chunks,最优先。
 *   2) 批量 embed 条数对齐、语义可分(相同句更近、不同句更远)。
 *   3) rewrite() / streamChat() 能连通并产出。
 */

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function main(): Promise<void> {
  registerConfiguredProviders();
  let failed = false;

  // ── 1 & 2. Embedding ──────────────────────────────────
  console.log("== Embedding(火山 doubao-embedding-vision)==");
  const texts = ["数据库索引如何加速查询", "数据库索引怎样提升检索速度", "今天天气很好适合出门"];
  const vecs = await getEmbeddingProvider().embed(texts);

  if (vecs.length !== texts.length) {
    console.error(`✗ 条数不符: 期望 ${texts.length},得到 ${vecs.length}`);
    failed = true;
  }
  for (let i = 0; i < vecs.length; i++) {
    const d = vecs[i].length;
    const ok = d === EMBEDDING_DIM;
    console.log(`  文本[${i}] 维度=${d} ${ok ? "✓" : "✗ 不是 " + EMBEDDING_DIM}`);
    if (!ok) failed = true;
  }
  if (vecs.length === 3) {
    const simClose = cosine(vecs[0], vecs[1]); // 同义
    const simFar = cosine(vecs[0], vecs[2]);   // 无关
    console.log(`  同义相似度=${simClose.toFixed(4)}  无关相似度=${simFar.toFixed(4)}`);
    if (simClose > simFar) console.log("  ✓ 语义可分(同义 > 无关)");
    else { console.error("  ✗ 语义不可分,embedding 质量存疑"); failed = true; }
  }

  // ── 3. rewrite ────────────────────────────────────────
  console.log("\n== rewrite(火山方舟 doubao)==");
  const rewritten = await getLLMProvider().rewrite(
    [
      { role: "user", content: "什么是 pgvector?" },
      { role: "assistant", content: "pgvector 是 PostgreSQL 的向量检索扩展。" },
    ],
    "它支持哪些索引?",
  );
  console.log("  改写结果:", rewritten);
  if (rewritten && rewritten !== "它支持哪些索引?") console.log("  ✓ 追问被改写成独立问题");
  else console.log("  · 未改写(回退原问题;非硬失败)");

  // ── 4. streamChat ─────────────────────────────────────
  console.log("\n== streamChat(火山方舟 doubao)==");
  const controller = new AbortController();
  let acc = "";
  for await (const delta of getLLMProvider().streamChat(
    [{ role: "user", content: "用一句话说明什么是向量检索。" }],
    controller.signal,
  )) {
    acc += delta;
    process.stdout.write(delta);
  }
  console.log("");
  if (acc.length > 0) console.log("  ✓ 流式产出成功,累计", acc.length, "字符");
  else { console.error("  ✗ 流式无输出"); failed = true; }

  console.log(failed ? "\n结果: ✗ 有失败项" : "\n结果: ✓ 全部通过");
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error("冒烟测试异常:", err);
  process.exit(1);
});
