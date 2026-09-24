/**
 * 集中的可调参数 —— 严格对齐 architecture-design.md §六.3 与 CLAUDE.md「可调参数」。
 *
 * 为什么集中一处:这些是「先上朴素 RAG、测出问题再调」的迭代旋钮,散落各处会漂移。
 * 尤其 CHUNK_SIZE / CHUNK_OVERLAP —— **改动需全量重新解析 + embedding + 重建索引**,
 * 必须在有数据入库前定稿(决策 11)。
 *
 * 允许用环境变量覆盖默认值(便于评测时不改代码调参),但:
 *   - 覆盖只读服务端 env,不走 NEXT_PUBLIC_(这些是后台/服务端参数,不进前端 bundle)。
 *   - 非法值(NaN / 越界)一律回退默认并告警,绝不静默吞成 0 把检索/分块搞坏。
 */

/** 读一个正整数环境变量;缺省或非法则回退 fallback。 */
function intParam(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    console.warn(`[params] ${name}="${raw}" 非法(需非负整数),回退默认 ${fallback}`);
    return fallback;
  }
  return n;
}

/** 读一个 [0,1] 的浮点环境变量;缺省或越界则回退 fallback。 */
function ratioParam(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    console.warn(`[params] ${name}="${raw}" 非法(需 0–1),回退默认 ${fallback}`);
    return fallback;
  }
  return n;
}

// ── 分块(改动需全量重建,入库前定稿)──────────────────
/** 每块目标字符数。 */
export const CHUNK_SIZE = intParam("CHUNK_SIZE", 500);
/** 相邻块重叠字符数,防止语义被切断在块边界。 */
export const CHUNK_OVERLAP = intParam("CHUNK_OVERLAP", 50);

// ── 摄入 ──────────────────────────────────────────────
/** 解析后累计字符 < 此值判为扫描件/图片型 PDF → 文档置 failed,不入库空内容(决策 10)。 */
export const SCAN_TEXT_THRESHOLD = intParam("SCAN_TEXT_THRESHOLD", 20);

// ── 检索 / grounded ───────────────────────────────────
/** 向量检索返回块数。 */
export const RETRIEVAL_TOP_K = intParam("RETRIEVAL_TOP_K", 5);
/** 最高相似度 < 此值 → grounded=false,回答标明属常识推测(不伪装文档依据)。 */
export const GROUNDED_SIMILARITY_THRESHOLD = ratioParam("GROUNDED_SIMILARITY_THRESHOLD", 0.7);

// ── 会话(进程内内存)─────────────────────────────────
/** 进程内会话上下文保留的最近轮数(只服务多轮对话,绝不读 messages 历史表)。 */
export const CONTEXT_WINDOW_ROUNDS = intParam("CONTEXT_WINDOW_ROUNDS", 6);
/** 会话内存空闲多久后可回收(ms);本期靠请求时惰性剔除,不起后台定时器。 */
export const SESSION_TTL_MS = intParam("SESSION_TTL_MS", 1_800_000);
/**
 * 拼进 LLM 请求的「历史对话」token 预算(近似,用字符数估算,不引 tiktoken)。
 * buildMessages 按此预算从最近往前截历史;超预算的更早对话丢弃,但最近一轮永不截。
 * 与 CONTEXT_WINDOW_ROUNDS 是两道独立闸:轮数管「取几轮」,预算管「取来的别撑爆上下文」。
 */
export const CONTEXT_TOKEN_BUDGET = intParam("CONTEXT_TOKEN_BUDGET", 2000);

// 一处导出,便于日志/自检整体打印当前生效参数。
export const params = {
  CHUNK_SIZE,
  CHUNK_OVERLAP,
  SCAN_TEXT_THRESHOLD,
  RETRIEVAL_TOP_K,
  GROUNDED_SIMILARITY_THRESHOLD,
  CONTEXT_WINDOW_ROUNDS,
  SESSION_TTL_MS,
  CONTEXT_TOKEN_BUDGET,
} as const;

// 分块自洽性:重叠必须小于块大小,否则步进 ≤0 会导致分块死循环。启动即拦。
if (CHUNK_OVERLAP >= CHUNK_SIZE) {
  throw new Error(
    `[params] CHUNK_OVERLAP(${CHUNK_OVERLAP}) 必须小于 CHUNK_SIZE(${CHUNK_SIZE}),否则分块步进为非正数。`,
  );
}
