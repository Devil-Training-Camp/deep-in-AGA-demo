import { CHUNK_SIZE, CHUNK_OVERLAP } from "../../config/params.ts";

/**
 * 文档分块 —— 字符数切分 + 段落/句号边界 + 重叠(决策 11)。
 *
 * 归属:lib/rag(分块、检索管道、query rewriting)。参数来自 config/params.ts,
 * 不在此硬编码 —— CHUNK_SIZE/CHUNK_OVERLAP 改动需全量重建,集中管理。
 *
 * 策略(经验默认值,非最优解;待评测样例建立后回调):
 *   - 目标每块 ~CHUNK_SIZE 字符,相邻块重叠 CHUNK_OVERLAP 字符;
 *   - 切点优先落在目标位置附近的段落分隔(\n\n),其次句末标点(。!?…\n),
 *     避免把一句话/一段话从中间切断,保住检索粒度的语义完整;
 *   - 找不到合适边界就在目标字符数硬切,保证有界推进。
 */

// 在 [from, to] 窗口内,从后往前找一个「好切点」(段落 > 句末标点)。找不到返回 -1。
function findBoundary(text: string, from: number, to: number): number {
  // 优先段落分隔
  const para = text.lastIndexOf("\n\n", to);
  if (para >= from) return para + 2;
  // 其次句末标点(中英)
  const SENTENCE_END = /[。!?…\n.!?]/;
  for (let i = to; i >= from; i--) {
    if (SENTENCE_END.test(text[i])) return i + 1;
  }
  return -1;
}

/**
 * 把整篇正文切成若干块。
 * @param text 已抽取、已归一化的正文(空串返回空数组)
 * @returns 非空、已 trim 的块数组,按原文顺序
 */
export function chunkText(text: string): string[] {
  const clean = text.trim();
  if (clean.length === 0) return [];
  if (clean.length <= CHUNK_SIZE) return [clean];

  const step = CHUNK_SIZE - CHUNK_OVERLAP; // params.ts 已保证 > 0
  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const hardEnd = Math.min(start + CHUNK_SIZE, clean.length);

    let end = hardEnd;
    if (hardEnd < clean.length) {
      // 在目标块的后半段里找边界(前半段找会让块过短),窗口 [start+step, hardEnd]。
      const boundary = findBoundary(clean, start + step, hardEnd);
      if (boundary > start) end = boundary;
    }

    const piece = clean.slice(start, end).trim();
    if (piece.length > 0) chunks.push(piece);

    if (end >= clean.length) break;
    // 下一块起点回退 overlap,保重叠;但必须严格前进,防死循环。
    const next = end - CHUNK_OVERLAP;
    start = next > start ? next : end;
  }

  return chunks;
}

/**
 * chunkDocument —— chunkText 的别名(语义更贴「切一篇文档」的调用场景)。
 * 分块策略遵循决策 11:字符数 CHUNK_SIZE/CHUNK_OVERLAP、段落>句子>硬切。
 * 注:不用 tiktoken 按 token 计数 —— 那是 OpenAI 分词器,与本项目火山厂商不匹配,
 * 且会多引一个依赖;决策 11 明确用字符数,改 token 属选型变更,本轮不引入。
 */
export const chunkDocument = chunkText;
