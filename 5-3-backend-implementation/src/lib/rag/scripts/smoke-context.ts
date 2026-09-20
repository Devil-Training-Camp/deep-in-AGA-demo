import { buildMessages, trimHistoryToBudget, type HistoryMessage } from "../context.ts";
import type { RetrievedChunk } from "../../db/doc-chunks.ts";
import { GROUNDED_SIMILARITY_THRESHOLD } from "../../../config/params.ts";

/**
 * buildMessages 纯逻辑冒烟(不打 API、不碰 DB)。
 *   node --experimental-strip-types src/lib/rag/scripts/smoke-context.ts
 *
 * 验证三步:①片段按相似度过滤后注入 system;②按预算截历史、最近一轮不截;③追加当前问题。
 */

let failed = false;
const check = (ok: boolean, msg: string): void => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed = true;
};

function chunk(id: number, text: string, similarity: number): RetrievedChunk {
  return { id, documentId: 1, text, similarity };
}

const TH = GROUNDED_SIMILARITY_THRESHOLD;

// ── 1. 片段过滤 + system 注入 ────────────────────────────────
{
  const chunks = [
    chunk(1, "高相关片段A", TH + 0.1),
    chunk(2, "低相关噪声", TH - 0.2),
    chunk(3, "高相关片段B", TH + 0.05),
  ];
  const msgs = buildMessages({ chunks, history: [], question: "问题?" });
  const sys = msgs.find((m) => m.role === "system");
  check(!!sys, "有 system 消息(存在过阈片段时)");
  check(!!sys && sys.content.includes("高相关片段A") && sys.content.includes("高相关片段B"), "过阈片段进了 system");
  check(!!sys && !sys.content.includes("低相关噪声"), "低相似度片段被过滤掉(不进 system)");
}

// ── 2. 片段全被过滤 → 不加 system ───────────────────────────
{
  const chunks = [chunk(1, "都很低", TH - 0.3), chunk(2, "也很低", TH - 0.1)];
  const msgs = buildMessages({ chunks, history: [], question: "问题?" });
  check(!msgs.some((m) => m.role === "system"), "片段全被过滤时不加 system(grounded=false 场景)");
}

// ── 3. 当前问题总是最后一条 user ────────────────────────────
{
  const msgs = buildMessages({ chunks: [], history: [], question: "当前问题" });
  const last = msgs[msgs.length - 1];
  check(last.role === "user" && last.content === "当前问题", "当前问题追加为最后一条 user");
}

// ── 4. 历史在预算内 → 全保留,顺序不变 ───────────────────────
{
  const history: HistoryMessage[] = [
    { role: "user", content: "早期问1" },
    { role: "assistant", content: "早期答1" },
    { role: "user", content: "最近问" },
    { role: "assistant", content: "最近答" },
  ];
  const kept = trimHistoryToBudget(history, 10_000);
  check(kept.length === 4, "预算充足时历史全保留");
  check(kept[0].content === "早期问1" && kept[3].content === "最近答", "历史顺序不变(最近在后)");
}

// ── 5. 预算紧张 → 截早期,但最近一轮(末尾 user+assistant)不截 ─
{
  const big = "x".repeat(100);
  const history: HistoryMessage[] = [
    { role: "user", content: big + "早期问" },
    { role: "assistant", content: big + "早期答" },
    { role: "user", content: "最近问" }, // 短
    { role: "assistant", content: "最近答" }, // 短
  ];
  // 预算只够最近一轮(最近问+最近答 ≈ 6 字符),放不下 100+ 的早期。
  const kept = trimHistoryToBudget(history, 20);
  check(kept.length === 2, "预算紧张时早期对话被截掉");
  check(kept[0].content === "最近问" && kept[1].content === "最近答", "最近一轮完整保留(user+assistant)");
}

// ── 6. 最近一轮自身就超预算 → 仍保留(宁可略超也不丢直接上文)──
{
  const huge = "y".repeat(500);
  const history: HistoryMessage[] = [
    { role: "user", content: "早期问" },
    { role: "assistant", content: "早期答" },
    { role: "user", content: huge }, // 单条就超预算
  ];
  const kept = trimHistoryToBudget(history, 50);
  check(kept.length === 1 && kept[0].content === huge, "最近一轮超预算也不截(只保留这一轮)");
}

// ── 7. 完整装配顺序:system → 历史 → 当前问题 ────────────────
{
  const chunks = [chunk(1, "资料", TH + 0.1)];
  const history: HistoryMessage[] = [
    { role: "user", content: "上一问" },
    { role: "assistant", content: "上一答" },
  ];
  const msgs = buildMessages({ chunks, history, question: "现在问" });
  check(msgs[0].role === "system", "第 0 条是 system");
  check(msgs[1].content === "上一问" && msgs[2].content === "上一答", "中间是历史");
  const last = msgs[msgs.length - 1];
  check(last.role === "user" && last.content === "现在问", "最后是当前问题");
}

console.log(failed ? "\n结果: ✗ 有失败项" : "\n结果: ✓ 全部通过");
process.exit(failed ? 1 : 0);
