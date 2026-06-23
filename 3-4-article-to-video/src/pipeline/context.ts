import { type JobPaths } from "../lib/paths";
import { type Config, type Secrets } from "../lib/config";
import { type JobState } from "../schema/state";

/** pipeline 运行期上下文：依赖通过它注入各步，便于测试与替换实现。 */
export interface PipelineContext {
  jobId: string;
  /** 输入文章原文（已写入 job 目录的 source.md 副本内容） */
  sourceMarkdown: string;
  /** 输入文章整体哈希，断点续跑全量判定依据 */
  sourceHash: string;
  /**
   * 原始文章所在目录（原始 articlePath 的 dirname）。
   * image 场景的 imagePath 相对它解析为绝对路径——不能用 job 目录里的 source.md 副本作基准。
   */
  articleDir: string;
  paths: JobPaths;
  config: Config;
  secrets: Secrets;
  /** 可变进度，步骤执行后回写 state.json */
  state: JobState;
  flags: PipelineFlags;
}

export interface PipelineFlags {
  /** 越过人工检查点，继续执行步骤 4~8（审阅放行后使用） */
  render: boolean;
  /** 干跑：mock LLM/TTS，不计费跑通全链（调试渲染/拼接用） */
  dryRun: boolean;
}

/** 单个 pipeline 步骤的统一签名。 */
export type PipelineStep = (ctx: PipelineContext) => Promise<void>;
