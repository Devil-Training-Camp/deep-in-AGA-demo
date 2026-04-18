import { ElevenLabsClient } from "elevenlabs";
import fs from "fs";
import path from "path";
import { type Script } from "../schema";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB";

export async function runTTS(script: Script, outputDir: string): Promise<void> {
  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  const audioDir = path.join(outputDir, "audio");
  fs.mkdirSync(audioDir, { recursive: true });

  const failed: number[] = [];

  for (const scene of script.scenes) {
    if (!scene.narration) {
      console.log(`  Scene ${scene.id} (${scene.type}): 旁白为空，跳过 TTS`);
      continue;
    }

    const audioPath = path.join(audioDir, `scene-${scene.id}.mp3`);
    const timestampsPath = path.join(audioDir, `scene-${scene.id}.timestamps.json`);

    try {
      console.log(`  Scene ${scene.id}: 生成语音...`);

      const response = await client.textToSpeech.convertWithTimestamps(VOICE_ID, {
        text: scene.narration,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
      });

      // 写入音频文件
      const audioBuffer = Buffer.from(response.audio_base64, "base64");
      fs.writeFileSync(audioPath, audioBuffer);

      // 写入时间戳文件
      if (response.alignment) {
        // 将 characters/character_start_times_seconds/character_end_times_seconds
        // 转换为 word-level 格式（ElevenLabs 返回字符级，合并为词）
        const timestamps = buildWordTimestamps(response.alignment);
        fs.writeFileSync(timestampsPath, JSON.stringify(timestamps, null, 2), "utf-8");
      }

      // 读取实际音频时长并回写
      const { parseFile } = await import("music-metadata");
      const metadata = await parseFile(audioPath);
      const actualDuration = metadata.format.duration;
      if (actualDuration !== undefined) {
        scene.duration = actualDuration;
        console.log(`  Scene ${scene.id}: ${actualDuration.toFixed(2)}s`);
      }
    } catch (err: any) {
      console.error(`  Scene ${scene.id} TTS 失败: ${err.message}`);
      failed.push(scene.id);
    }
  }

  if (failed.length > 0) {
    console.warn(`\n⚠ 以下 scene TTS 失败，将渲染静默帧: ${failed.join(", ")}`);
  }
}

// ElevenLabs 返回字符级时间戳，合并成词组（以空格/标点为分隔）
function buildWordTimestamps(
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  }
): Array<{ word: string; start: number; end: number }> {
  const result: Array<{ word: string; start: number; end: number }> = [];
  let wordChars: string[] = [];
  let wordStart: number | null = null;
  let wordEnd = 0;

  const flush = () => {
    if (wordChars.length > 0 && wordStart !== null) {
      const word = wordChars.join("").trim();
      if (word) {
        result.push({ word, start: wordStart, end: wordEnd });
      }
      wordChars = [];
      wordStart = null;
    }
  };

  for (let i = 0; i < alignment.characters.length; i++) {
    const ch = alignment.characters[i];
    const start = alignment.character_start_times_seconds[i];
    const end = alignment.character_end_times_seconds[i];

    if (ch === " " || ch === "\n") {
      flush();
    } else {
      if (wordStart === null) wordStart = start;
      wordChars.push(ch);
      wordEnd = end;
    }
  }
  flush();

  return result;
}
