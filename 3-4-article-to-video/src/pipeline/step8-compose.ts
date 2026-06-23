import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/logger";
import { loadScriptEnriched } from "./script-io";
import { concatClips } from "../integrations/ffmpeg";
import { type PipelineContext } from "./context";

/**
 * 步骤 8：合成与编码（自动）。按场景顺序把各 clip 用 ffmpeg concat 成 `final.mp4`。
 * 段内淡入淡出已在 Remotion 组件里做，这里只做硬拼接；字幕外挂不烧录。
 */
export async function step8Compose(ctx: PipelineContext): Promise<void> {
  logger.step("[8/8] 合成与编码");
  const scenes = loadScriptEnriched(ctx.paths.script);
  const clips = scenes.map((s) => ctx.paths.clipFile(s.id));

  const missing = clips.filter((c) => !fs.existsSync(c));
  if (missing.length > 0) {
    throw new Error(`有 ${missing.length} 个 clip 缺失，无法合成（先跑 step6）：${missing[0]}`);
  }

  const listFile = path.join(ctx.paths.root, "concat-list.txt");
  await concatClips(clips, ctx.paths.final, listFile);

  ctx.state.stages.final = { done: true, hash: "" };
  logger.info(`待拼接 ${clips.length} 段 → 已合成 ${ctx.paths.final}`);
  logger.info(`交付物：${ctx.paths.final} + ${ctx.paths.subtitles}`);
}
