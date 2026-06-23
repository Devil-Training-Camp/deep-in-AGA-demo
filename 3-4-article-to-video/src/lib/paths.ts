import path from "node:path";

/**
 * 单个 job 目录的产物布局（requirements.md §产物文件组织）。
 * 所有路径以 job 根目录为基准计算，集中在此一处定义，避免散落字符串拼接。
 */
export interface JobPaths {
  root: string;
  source: string;
  parsed: string;
  script: string;
  audioDir: string;
  clipsDir: string;
  subtitles: string;
  final: string;
  state: string;
  audioFile: (sceneId: string) => string;
  /** 音频元数据 sidecar（path/durationSec/alignment），不进 02-script.json */
  audioSidecar: (sceneId: string) => string;
  clipFile: (sceneId: string) => string;
}

export function jobPaths(outputDir: string, jobId: string): JobPaths {
  const root = path.join(outputDir, jobId);
  return {
    root,
    source: path.join(root, "source.md"),
    parsed: path.join(root, "01-parsed.json"),
    script: path.join(root, "02-script.json"),
    audioDir: path.join(root, "audio"),
    clipsDir: path.join(root, "clips"),
    subtitles: path.join(root, "subtitles.srt"),
    final: path.join(root, "final.mp4"),
    state: path.join(root, "state.json"),
    audioFile: (sceneId: string) => path.join(root, "audio", `${sceneId}.mp3`),
    audioSidecar: (sceneId: string) => path.join(root, "audio", `${sceneId}.json`),
    clipFile: (sceneId: string) => path.join(root, "clips", `${sceneId}.mp4`),
  };
}
