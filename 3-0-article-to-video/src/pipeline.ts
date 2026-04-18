import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import path from "path";
import { ScriptSchema } from "./schema";
import { runTTS } from "./steps/2-tts";
import { runBRoll } from "./steps/3-broll";
import { runCompose } from "./steps/4-compose";

function doneFile(outputDir: string, step: number) {
  return path.join(outputDir, `.step${step}.done`);
}

function isDone(outputDir: string, step: number, force: boolean): boolean {
  return !force && fs.existsSync(doneFile(outputDir, step));
}

function markDone(outputDir: string, step: number) {
  fs.writeFileSync(doneFile(outputDir, step), new Date().toISOString(), "utf-8");
}

function clearDoneFiles(outputDir: string) {
  [2, 3, 4].forEach((step) => {
    const f = doneFile(outputDir, step);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  console.log("已清除所有断点标记，全量重跑");
}

export interface PipelineOptions {
  force?: boolean;
}

/**
 * 执行完整渲染流水线（TTS → B-roll → 视频合成）
 * @param scriptPath script.json 的路径
 * @param options 可选配置
 * @returns 最终视频文件路径
 */
export async function runPipeline(
  scriptPath: string,
  options: PipelineOptions = {}
): Promise<string> {
  const { force = false } = options;

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`找不到脚本文件: ${scriptPath}`);
  }

  const outputDir = path.dirname(path.resolve(scriptPath));

  if (force) {
    clearDoneFiles(outputDir);
  }

  // 读取并校验 script.json
  const raw = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));
  const script = ScriptSchema.parse(raw); // 校验失败直接抛错终止

  console.log(`\n▶ Pipeline: ${scriptPath}`);
  console.log(`  共 ${script.scenes.length} 个场景，预估时长 ${Math.round(script.total_duration / 60)} 分钟\n`);

  // Step 2: TTS
  if (isDone(outputDir, 2, force)) {
    console.log("✓ Step 2 (TTS) 已完成，跳过");
  } else {
    console.log("→ Step 2: 语音合成...");
    await runTTS(script, outputDir);

    // TTS 完成后，将带有实际 duration 的 script 回写
    fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2), "utf-8");
    console.log("  ✓ script.json duration 已更新为实际音频时长");

    markDone(outputDir, 2);
    console.log("✓ Step 2 完成\n");
  }

  // Step 3: SVG 插图生成
  if (isDone(outputDir, 3, force)) {
    console.log("✓ Step 3 (插图) 已完成，跳过");
  } else {
    console.log("→ Step 3: 生成 SVG 插图...");
    await runBRoll(script, outputDir);
    markDone(outputDir, 3);
    console.log("✓ Step 3 完成\n");
  }

  // Step 4: Remotion 渲染
  if (isDone(outputDir, 4, force)) {
    console.log("✓ Step 4 (Remotion) 已完成，跳过");
  } else {
    console.log("→ Step 4: 视频合成...");
    await runCompose(script, outputDir);
    markDone(outputDir, 4);
    console.log("✓ Step 4 完成\n");
  }

  const finalPath = path.join(outputDir, "final.mp4");
  console.log(`\n🎬 完成！输出文件: ${finalPath}`);

  return finalPath;
}
