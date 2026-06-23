import fs from "node:fs";
import { logger } from "../lib/logger";
import { loadScriptEnriched } from "./script-io";
import { readAudioSidecar } from "./audio-io";
import { buildSceneInputProps } from "./render-input";
import { getServeUrl, renderScene } from "../integrations/remotion-render";
import { type PipelineContext } from "./context";

/**
 * 步骤 6：逐场景渲染（自动，耗时）。Remotion 编程式 API，每场景出 `clips/scene-XXX.mp4`。
 *
 * bundle 一次缓存复用，逐场景串行渲染（单个渲染即吃满机器，不并发）。
 * inputProps 经 buildSceneInputProps 单点组装（R4/R5/R6）。
 * 增量：clipDone 且 clip 文件存在才跳过。
 */
export async function step6Render(ctx: PipelineContext): Promise<void> {
  logger.step("[6/8] 逐场景渲染");
  const scenes = loadScriptEnriched(ctx.paths.script);

  // publicDir = job 目录：组件 staticFile 据此取 audio/<id>.mp3、images/<id><ext>
  const serveUrl = await getServeUrl(ctx.paths.root);
  logger.info("Remotion 工程已打包");

  for (const scene of scenes) {
    const progress = ctx.state.scenes[scene.id];
    const clipPath = ctx.paths.clipFile(scene.id);

    if (progress?.clipDone && fs.existsSync(clipPath)) {
      logger.info(`${scene.id} clip 已存在且未变，跳过`);
      continue;
    }

    const sidecar = readAudioSidecar(ctx.paths, scene.id);
    const inputProps = buildSceneInputProps(scene, sidecar, ctx.config);
    await renderScene(serveUrl, inputProps, clipPath);

    if (progress) progress.clipDone = true;
    logger.info(`${scene.id} 渲染完成 → ${clipPath}`);
  }
}
