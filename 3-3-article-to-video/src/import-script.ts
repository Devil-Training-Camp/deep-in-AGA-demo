#!/usr/bin/env -S npx tsx
import fs from "node:fs";
import { parseArgs } from "node:util";
import { sha256, hashObject } from "./lib/hash";
import { deriveJobId, ensureJobDirs } from "./lib/job";
import { jobPaths } from "./lib/paths";
import { loadConfig } from "./lib/config";
import { ScriptSchema } from "./schema";
import { emptyJobState } from "./schema/state";
import { writeState } from "./lib/state-store";
import { logger } from "./lib/logger";

/**
 * 把外部(如 /gen-script Skill)交互生成的脚本接入渲染管线。
 *
 * 用法：npx tsx src/import-script.ts <article.md> <script.json> [--output <dir>]
 *
 * 做三件事：
 *   1. 按 ScriptSchema 校验 script.json（不合法直接报错退出）；
 *   2. 写入该文章对应 job 的 02-script.json；
 *   3. seed state.json（标记 script 阶段已完成 + 记录 sourceHash），
 *      这样后续 `run --render` 会跳过自动生成（step2），直接用这份脚本走 TTS→渲染→合成。
 *
 * 之后 step1(解析) / step3(派生 id/scroll/estimatedDuration) 仍由 pipeline 正常补齐。
 */
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { output: { type: "string" } },
});

const [articlePath, scriptJsonPath] = positionals;
if (!articlePath || !scriptJsonPath) {
  logger.error(
    "用法：npx tsx src/import-script.ts <article.md> <script.json> [--output <dir>]",
  );
  process.exit(1);
}
if (!fs.existsSync(articlePath) || !articlePath.endsWith(".md")) {
  logger.error(`文章须为存在的 .md 文件：${articlePath}`);
  process.exit(1);
}

const md = fs.readFileSync(articlePath, "utf8");
const sourceHash = sha256(md);
const jobId = deriveJobId(md);

const config = loadConfig();
const paths = jobPaths(values.output ?? config.outputDir, jobId);
ensureJobDirs(paths.root);

const raw: unknown = JSON.parse(fs.readFileSync(scriptJsonPath, "utf8"));
const parsed = ScriptSchema.safeParse(raw);
if (!parsed.success) {
  logger.error("脚本不符合 ScriptSchema，请修正后重试：");
  logger.error(parsed.error.message);
  process.exit(1);
}
const script = parsed.data;

fs.writeFileSync(paths.script, JSON.stringify(script, null, 2), "utf8");

// 标记 script 阶段完成，使 run 时跳过自动生成、保留这份人工/交互脚本
const state = emptyJobState(jobId, sourceHash);
state.stages.script = { done: true, hash: hashObject(script) };
writeState(paths.state, state);

logger.info(`已写入 ${paths.script}（${script.scenes.length} 个场景）`);
logger.info(`审阅：${paths.script}`);
logger.info(`渲染：npx tsx src/cli.ts run ${articlePath} --render`);
logger.info(`不计费试渲：npx tsx src/cli.ts run ${articlePath} --dry-run --render`);
