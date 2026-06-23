import fs from "node:fs";
import { logger } from "../lib/logger";
import { hashObject } from "../lib/hash";
import { type PipelineContext } from "./context";
import { parseMarkdown } from "./parse/mdast-to-blocks";

/**
 * 步骤 1：解析与结构化（自动，确定性）。
 * 输入文章 Markdown → `01-parsed.json`（章节/正文/代码块/图片/列表/表格）。
 *
 * 用 `unified` + `remark-parse`(+ gfm) 得到 mdast，再按内容处理规则
 * （requirements.md §内容处理规则）拍平成有序 block 序列。
 */
export async function step1Parse(ctx: PipelineContext): Promise<void> {
  logger.step("[1/8] 解析与结构化");

  const existing = ctx.state.stages.parsed;
  if (existing?.done && fs.existsSync(ctx.paths.parsed)) {
    logger.info("已存在且输入未变，跳过");
    return;
  }

  const parsed = parseMarkdown(ctx.sourceMarkdown);

  fs.writeFileSync(ctx.paths.parsed, JSON.stringify(parsed, null, 2), "utf8");
  ctx.state.stages.parsed = { done: true, hash: hashObject(parsed) };
  logger.info(
    `产物 → ${ctx.paths.parsed}（${parsed.blocks.length} 个 block，标题「${parsed.title}」）`,
  );
}
