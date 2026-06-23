import fs from "node:fs";
import { logger } from "../lib/logger";
import { loadScriptEnriched } from "./script-io";
import { readAudioSidecar, writeAudioSidecar } from "./audio-io";
import { synthesizeScene, applyPronunciationAliases } from "../integrations/elevenlabs";
import { type PipelineContext } from "./context";

/**
 * 步骤 4：TTS 语音合成（自动，计费）。逐场景调 ElevenLabs `with-timestamps`，
 * 产出 `audio/scene-XXX.mp3` + sidecar（path/durationSec/alignment）。
 *
 * 增量重跑（R1）：
 * - 跳过条件 = audioDone **且 sidecar 在 且 mp3 文件在**（dry-run 无 mp3，path 为空串免检）；
 *   只看 state 或只看 sidecar 都不够——mp3 被删而 sidecar 还在时，step6 会挂载缺失音轨。
 * - 重新合成后若 durationSec 与旧 sidecar 不同 → 置 clipDone=false（音频时长变牵动排版，须重渲）。
 *   这条在「mp3 被删、口播未变」重合成出不同时长时生效（此路径 narrationHash 未变，sync 不会清 clipDone）。
 * 空 narration（静音场景）跳过，不写 sidecar。
 */
export async function step4Tts(ctx: PipelineContext): Promise<void> {
  logger.step("[4/8] TTS 语音合成");
  const scenes = loadScriptEnriched(ctx.paths.script);

  for (const scene of scenes) {
    const progress = ctx.state.scenes[scene.id];
    if (!progress) continue; // step3 已同步，理论上不会缺

    if (!scene.narration.trim()) {
      logger.info(`${scene.id} 无口播（静音），跳过`);
      continue;
    }

    const prev = readAudioSidecar(ctx.paths, scene.id);
    const audioPresent =
      prev !== null && (prev.path === "" || fs.existsSync(ctx.paths.audioFile(scene.id)));
    if (progress.audioDone && audioPresent) {
      logger.info(`${scene.id} 音频已存在且口播未变，跳过`);
      continue;
    }

    const text = applyPronunciationAliases(
      scene.narration,
      ctx.config.pronunciationAliases,
    );
    const audio = await synthesizeScene(text, ctx.paths.audioFile(scene.id), ctx.config, {
      dryRun: ctx.flags.dryRun,
      apiKey: ctx.secrets.elevenLabsApiKey,
    });
    writeAudioSidecar(ctx.paths, scene.id, audio);

    // 时长变化 → 旧 clip 与新音频对不上，强制重渲（R1）
    if (prev && Math.abs(prev.durationSec - audio.durationSec) > 1e-3) {
      progress.clipDone = false;
    }
    progress.audioDone = true;
    logger.info(`${scene.id} 合成完成（${audio.durationSec.toFixed(1)}s）`);
  }
}
