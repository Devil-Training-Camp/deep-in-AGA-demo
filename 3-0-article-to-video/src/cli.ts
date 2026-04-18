import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Command } from "commander";
import { runPipeline } from "./pipeline";

const program = new Command();

program
  .name("article-to-video")
  .description("将分镜脚本渲染为视频")
  .version("1.0.0")
  .argument("<script>", "script.json 路径")
  .option("-f, --force", "强制重跑所有步骤，忽略断点缓存")
  .action(async (script: string, options: { force?: boolean }) => {
    try {
      await runPipeline(script, { force: options.force });
    } catch (err: any) {
      if (err.name === "ZodError") {
        console.error("\n❌ script.json 校验失败，请检查以下字段：");
        console.error(JSON.stringify(err.errors, null, 2));
      } else {
        console.error("\n❌ Pipeline 执行失败:", err.message || err);
      }
      process.exit(1);
    }
  });

program.parse();
