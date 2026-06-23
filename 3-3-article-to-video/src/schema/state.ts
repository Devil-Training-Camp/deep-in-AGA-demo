/**
 * state.json：断点续跑的依据（technical-design.md §state.json）。
 *
 * 每步幂等、内容寻址——重跑时对比哈希决定跳过还是重做。
 *
 * 注：`id` 已由可视字段哈希派生，故「可视字段变」等价于「id 变 → 新场景记录」，
 * 单独的 visualHash 按构造冗余,已删除。记录里只保留 narrationHash 一路：
 *   - narration 变 → 重跑该场景 TTS；且因音频时长变化牵动排版，clip 也要重渲。
 */

export interface StageState {
  done: boolean;
  hash: string;
}

export interface SceneProgress {
  /** 口播文本哈希，变 → 重跑 TTS + 重渲该 clip（音频时长变会牵动排版） */
  narrationHash: string;
  audioDone: boolean;
  clipDone: boolean;
}

export interface JobState {
  jobId: string;
  /** 输入文章哈希，整体变了就全量重跑 */
  sourceHash: string;
  stages: {
    parsed?: StageState;
    script?: StageState;
    subtitles?: StageState;
    final?: StageState;
  };
  /** 按 scene id 记录逐场景进度 */
  scenes: Record<string, SceneProgress>;
  /** 人工检查点是否已放行（审阅 02-script.json 后置 true） */
  scriptApproved: boolean;
}

export function emptyJobState(jobId: string, sourceHash: string): JobState {
  return {
    jobId,
    sourceHash,
    stages: {},
    scenes: {},
    scriptApproved: false,
  };
}
