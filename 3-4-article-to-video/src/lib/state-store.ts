import fs from "node:fs";
import { emptyJobState, type JobState } from "../schema/state";

/** state.json 的读写。占位阶段仅做 JSON 持久化，哈希比对逻辑在 pipeline 各步内。 */

export function readState(
  statePath: string,
  jobId: string,
  sourceHash: string,
): JobState {
  if (!fs.existsSync(statePath)) {
    return emptyJobState(jobId, sourceHash);
  }
  const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as JobState;
  // 输入文章整体变化 → 丢弃旧进度，全量重跑（technical-design.md §断点续跑）
  if (state.sourceHash !== sourceHash) {
    return emptyJobState(jobId, sourceHash);
  }
  return state;
}

export function writeState(statePath: string, state: JobState): void {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}
