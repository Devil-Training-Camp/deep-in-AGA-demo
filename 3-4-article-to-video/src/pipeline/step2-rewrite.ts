import fs from "node:fs";
import { logger } from "../lib/logger";
import { writeScript } from "./script-io";
import { generateScript } from "../integrations/claude";
import { type ParsedDoc } from "./parse/mdast-to-blocks";
import { type PipelineContext } from "./context";

/**
 * 步骤 2：改写为口播脚本（自动，AI 判断）。
 * 输入 `01-parsed.json` → 调 Claude 产出 LLM 子集脚本（场景类型 + 可视字段 + narration，
 * 不含 pipeline 派生的 id/scroll/estimatedDuration），步骤 3 再 enrich 补齐。
 *
 * 跳过条件按 stages.script.done（step3 落定）：脚本已生成后重跑不再调 LLM，
 * 保护人工检查点对 02-script.json 的编辑；如需重新生成请删除 02-script.json。
 */
export async function step2Rewrite(ctx: PipelineContext): Promise<void> {
  logger.step("[2/8] 改写为口播脚本");

  if (ctx.state.stages.script?.done && fs.existsSync(ctx.paths.script)) {
    logger.info("脚本已存在，跳过（如需重新生成请删除 02-script.json）");
    return;
  }

  const parsed = JSON.parse(fs.readFileSync(ctx.paths.parsed, "utf8")) as ParsedDoc;
  const draft = await generateScript(parsed, ctx.config, {
    dryRun: ctx.flags.dryRun,
    apiKey: ctx.secrets.anthropicApiKey,
    authToken: ctx.secrets.anthropicAuthToken,
    baseURL: ctx.secrets.anthropicBaseURL,
  });

  writeScript(ctx.paths.script, draft);
  logger.info(`口播草稿 → ${ctx.paths.script}（${draft.scenes.length} 个场景）`);
}
