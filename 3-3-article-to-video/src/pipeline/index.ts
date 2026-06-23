import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/logger";
import { sha256 } from "../lib/hash";
import { type Config, type Secrets } from "../lib/config";
import { jobPaths } from "../lib/paths";
import { deriveJobId, ensureJobDirs } from "../lib/job";
import { readState, writeState } from "../lib/state-store";
import { type PipelineContext, type PipelineFlags, type PipelineStep } from "./context";
import { loadScript, gcOrphans } from "./script-io";
import { step1Parse } from "./step1-parse";
import { step2Rewrite } from "./step2-rewrite";
import { step3Storyboard } from "./step3-storyboard";
import { step4Tts } from "./step4-tts";
import { step5Visuals } from "./step5-visuals";
import { step6Render } from "./step6-render";
import { step7Subtitles } from "./step7-subtitles";
import { step8Compose } from "./step8-compose";

/** 人工检查点之前的半自动步骤（脚本 + 分镜，改起来最便宜、在烧钱步骤之前）。 */
const PRE_CHECKPOINT: PipelineStep[] = [step1Parse, step2Rewrite, step3Storyboard];

/** 放行后全自动的步骤（TTS → 素材 → 渲染 → 字幕 → 合成）。 */
const POST_CHECKPOINT: PipelineStep[] = [
  step4Tts,
  step5Visuals,
  step6Render,
  step7Subtitles,
  step8Compose,
];

export interface RunOptions {
  articlePath: string;
  config: Config;
  secrets: Secrets;
  flags: PipelineFlags;
}

/**
 * 运行整条 pipeline，以「脚本 + 分镜」处的单一人工检查点为界
 * （requirements.md §整体架构）。断点续跑靠 state.json + 内容哈希，
 * 每步执行后即时回写状态，任一步失败可从失败点续上。
 */
export async function runPipeline(opts: RunOptions): Promise<void> {
  const { articlePath, config, secrets, flags } = opts;

  const abs = path.resolve(articlePath);
  if (!fs.existsSync(abs) || !abs.endsWith(".md")) {
    throw new Error(`输入须为存在的本地 .md 文件：${articlePath}`);
  }
  const sourceMarkdown = fs.readFileSync(abs, "utf8");
  const sourceHash = sha256(sourceMarkdown);

  const jobId = deriveJobId(sourceMarkdown);
  const paths = jobPaths(config.outputDir, jobId);
  ensureJobDirs(paths.root);
  fs.writeFileSync(paths.source, sourceMarkdown, "utf8"); // 输入快照副本

  const state = readState(paths.state, jobId, sourceHash);
  const ctx: PipelineContext = {
    jobId,
    sourceMarkdown,
    sourceHash,
    articleDir: path.dirname(abs), // 原始文章目录，image 路径解析基准（R6）
    paths,
    config,
    secrets,
    state,
    flags,
  };

  logger.info(`job：${jobId}`);
  logger.info(`目录：${paths.root}`);

  await runSteps(ctx, PRE_CHECKPOINT);
  // step3 已产出最终 id 集合，回收旧 id 的孤儿产物（R3）
  if (fs.existsSync(paths.script)) {
    const removed = gcOrphans(ctx.state, loadScript(paths.script), paths);
    if (removed > 0) logger.info(`清理 ${removed} 个孤儿场景产物`);
  }
  writeState(paths.state, ctx.state);

  // —— 人工检查点 ——
  if (!flags.render && !ctx.state.scriptApproved) {
    logger.warn("已到人工检查点：请审阅 / 编辑 02-script.json");
    logger.warn(`  ${paths.script}`);
    logger.warn("放行后用 `--render` 重跑以继续 TTS → 渲染 → 合成");
    return;
  }

  ctx.state.scriptApproved = true;
  await runSteps(ctx, POST_CHECKPOINT);
  writeState(paths.state, ctx.state);

  logger.info("pipeline 完成（占位产物）");
}

async function runSteps(ctx: PipelineContext, steps: PipelineStep[]): Promise<void> {
  for (const step of steps) {
    await step(ctx);
    writeState(ctx.paths.state, ctx.state); // 每步后落盘，支撑断点续跑
  }
}
