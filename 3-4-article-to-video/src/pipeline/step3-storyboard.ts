import { logger } from "../lib/logger";
import { hashObject } from "../lib/hash";
import { loadScript, enrichScript, writeScript, syncSceneProgress } from "./script-io";
import { type PipelineContext } from "./context";

/**
 * 步骤 3：分镜规划（自动，AI 判断）。
 * 输入步骤 2 的口播草稿 → `02-script.json`（场景类型 + 可视字段 + 口播）。
 *
 * 实现要点：为每段口播决定画面（title/narration/code/image），补全可视字段。
 * 与步骤 2 共用同一份 ScriptSchema，最终落盘的 02-script.json 即人工检查点的编辑对象。
 *
 * 富化在此发生：派生 id、按行数阈值定 scroll、按字数估 estimatedDuration、
 * 归一化 language。富化后落盘的 02-script.json 即人工检查点的完整编辑对象。
 */
export async function step3Storyboard(ctx: PipelineContext): Promise<void> {
  logger.step("[3/8] 分镜规划");

  // TODO: 调 LLM 在草稿基础上补全可视字段（code/bullets/imagePath…）
  const draft = loadScript(ctx.paths.script);
  const script = enrichScript(draft, ctx.config); // 补齐 pipeline 派生字段
  writeScript(ctx.paths.script, script);

  // 据最终脚本刷新逐场景进度哈希（增量重跑依据，键为派生 id）
  syncSceneProgress(ctx.state, script);
  ctx.state.stages.script = { done: true, hash: hashObject(script) };

  logger.info(`分镜脚本 → ${ctx.paths.script}（${script.scenes.length} 个场景）`);
  logger.info("发车前预算检查：占位（实现时按预估时长粗算是否超 5 分钟）");
}
