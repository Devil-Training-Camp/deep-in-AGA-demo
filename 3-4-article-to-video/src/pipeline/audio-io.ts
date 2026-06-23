import fs from "node:fs";
import { type SceneAudio } from "../schema/scene";
import { type JobPaths } from "../lib/paths";

/**
 * 音频元数据 sidecar 的读写。
 *
 * 为什么用 sidecar 而非塞回 02-script.json：audio（path/durationSec/alignment）不在
 * ScriptSchema，塞回会污染人工编辑文件、破坏「单一 schema 两端一致」。sidecar 以
 * scene.id 命名，随 id 失效，天然契合增量重跑。
 */

export function writeAudioSidecar(paths: JobPaths, id: string, audio: SceneAudio): void {
  fs.writeFileSync(paths.audioSidecar(id), JSON.stringify(audio, null, 2), "utf8");
}

export function readAudioSidecar(paths: JobPaths, id: string): SceneAudio | null {
  const p = paths.audioSidecar(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as SceneAudio;
}

export function audioSidecarExists(paths: JobPaths, id: string): boolean {
  return fs.existsSync(paths.audioSidecar(id));
}
