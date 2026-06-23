import fs from "node:fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { type SceneAudio, type CharAlignment } from "../schema/scene";
import { type Config } from "../lib/config";

/**
 * ElevenLabs 集成（步骤 4 TTS + 字符级时间戳）。
 *
 * 真实路径：`textToSpeech.convertWithTimestamps(voiceId,{text,modelId,outputFormat})`
 * → { audioBase64, alignment }。durationSec 取 alignment 末值（≈音频总时长，规避 ffprobe）。
 * dry-run：不计费，写空 path + 合成线性 alignment，时长按字数估算。
 */

export interface SynthOptions {
  dryRun: boolean;
  apiKey?: string;
}

/** 合成单个场景的语音。dry-run 下 path 为空串（不挂音轨），仅用于跑通时间轴/字幕。 */
export async function synthesizeScene(
  text: string,
  outMp3Path: string,
  config: Config,
  opts: SynthOptions,
): Promise<SceneAudio> {
  if (opts.dryRun) {
    const durationSec = estimateDurationSec(text, config);
    return { path: "", durationSec, alignment: syntheticAlignment(text, durationSec) };
  }
  if (!opts.apiKey) {
    throw new Error("缺少 ELEVENLABS_API_KEY（在 .env 配置，或用 --dry-run）");
  }
  if (!config.ttsVoiceId) {
    throw new Error("缺少 ttsVoiceId（在配置文件设置 ElevenLabs voice id）");
  }

  const client = new ElevenLabsClient({ apiKey: opts.apiKey });
  const res = await client.textToSpeech.convertWithTimestamps(config.ttsVoiceId, {
    text,
    modelId: config.ttsModel,
    outputFormat: "mp3_44100_128",
  });

  fs.writeFileSync(outMp3Path, Buffer.from(res.audioBase64, "base64"));

  const raw = res.alignment ?? res.normalizedAlignment;
  const alignment: CharAlignment = raw
    ? {
        characters: raw.characters,
        characterStartTimesSeconds: raw.characterStartTimesSeconds,
        characterEndTimesSeconds: raw.characterEndTimesSeconds,
      }
    : syntheticAlignment(text, estimateDurationSec(text, config));

  const durationSec =
    alignment.characterEndTimesSeconds.at(-1) ?? estimateDurationSec(text, config);

  return { path: outMp3Path, durationSec, alignment };
}

/** 送 TTS 前的术语纠音：按别名表逐项替换（中文不支持音素级发音词典）。 */
export function applyPronunciationAliases(
  text: string,
  aliases: Record<string, string>,
): string {
  let out = text;
  for (const [from, to] of Object.entries(aliases)) {
    out = out.split(from).join(to);
  }
  return out;
}

function estimateDurationSec(text: string, config: Config): number {
  return Math.max(0.5, text.length / config.estimateCharsPerSec);
}

/** 线性均分的合成 alignment：dry-run 及接口无 alignment 时的兜底，供字幕粗对齐。 */
function syntheticAlignment(text: string, durationSec: number): CharAlignment {
  const characters = [...text];
  const n = characters.length;
  const step = n > 0 ? durationSec / n : 0;
  return {
    characters,
    characterStartTimesSeconds: characters.map((_, i) => +(i * step).toFixed(3)),
    characterEndTimesSeconds: characters.map((_, i) => +((i + 1) * step).toFixed(3)),
  };
}
