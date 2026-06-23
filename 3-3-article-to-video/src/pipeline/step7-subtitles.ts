import fs from "node:fs";
import { logger } from "../lib/logger";
import { loadScriptEnriched } from "./script-io";
import { readAudioSidecar } from "./audio-io";
import { buildSceneInputProps } from "./render-input";
import { alignmentToCues, cuesToSrt, type Cue } from "./subtitle/align-to-cues";
import { computeDurationInFrames } from "../../remotion/props";
import { VIDEO } from "../../remotion/theme";
import { type PipelineContext } from "./context";

/**
 * 步骤 7：字幕生成（自动，不计费，可与 step6 并行）。
 * 各场景 sidecar 的字符级 alignment → 词/句 cue，叠加场景起点偏移 → 外挂 `subtitles.srt`。
 *
 * R2：每段起点偏移用与渲染**同一个** computeDurationInFrames 复算，保证字幕与成片逐段对齐。
 * R8：静音/无 alignment 场景不产 cue，但其时长仍计入偏移。
 */
export async function step7Subtitles(ctx: PipelineContext): Promise<void> {
  logger.step("[7/8] 字幕生成");
  const scenes = loadScriptEnriched(ctx.paths.script);

  const cues: Cue[] = [];
  let offsetSec = 0;

  for (const scene of scenes) {
    const sidecar = readAudioSidecar(ctx.paths, scene.id);
    // 与渲染同源算时长（R2/R5）：同一份 inputProps、同一个换算函数
    const props = buildSceneInputProps(scene, sidecar, ctx.config);
    const durSec = computeDurationInFrames(props) / VIDEO.fps;

    if (sidecar?.alignment && sidecar.alignment.characters.length > 0) {
      cues.push(...alignmentToCues(sidecar.alignment, offsetSec));
    }
    offsetSec += durSec;
  }

  fs.writeFileSync(ctx.paths.subtitles, cuesToSrt(cues), "utf8");
  ctx.state.stages.subtitles = { done: true, hash: "" };
  logger.info(
    `字幕 → ${ctx.paths.subtitles}（${cues.length} 条 cue，全片约 ${offsetSec.toFixed(1)}s）`,
  );
}
