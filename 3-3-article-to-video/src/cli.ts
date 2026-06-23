#!/usr/bin/env -S npx tsx
import { parseArgs } from "node:util";
import { logger } from "./lib/logger";
import { loadConfig, loadSecrets } from "./lib/config";
import { runPipeline } from "./pipeline";

const USAGE = `文章转视频 pipeline (@demos/3-3-article-to-video)

用法：
  tsx src/cli.ts run <article.md> [选项]

命令：
  run <article.md>   对一篇本地 Markdown 文章跑 pipeline

选项：
  --render           越过人工检查点，继续执行 TTS → 渲染 → 合成
  --dry-run          干跑：mock LLM/TTS，不计费跑通全链（调试用）
  --output <dir>     产物根目录（默认 output）
  --config <path>    配置文件路径（JSON，可选）
  -h, --help         显示帮助

工作流：
  1. 先跑 \`run <article.md>\`，产出 02-script.json 后停在人工检查点
  2. 审阅 / 编辑 02-script.json
  3. 加 \`--render\` 重跑，断点续跑只重做受影响的场景
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      render: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      output: { type: "string" },
      config: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(USAGE);
    return;
  }

  const [command, articlePath] = positionals;
  if (command !== "run") {
    logger.error(`未知命令：${command}`);
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }
  if (!articlePath) {
    logger.error("缺少输入文件：tsx src/cli.ts run <article.md>");
    process.exitCode = 1;
    return;
  }

  const config = loadConfig(values.config);
  if (values.output) config.outputDir = values.output;
  const secrets = loadSecrets();

  await runPipeline({
    articlePath,
    config,
    secrets,
    flags: {
      render: values.render ?? false,
      dryRun: values["dry-run"] ?? false,
    },
  });
}

main().catch((err: unknown) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
