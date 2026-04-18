import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";
import { type Script } from "../schema";
import { type VisualSpec } from "../visual-schema";

export async function runCompose(script: Script, outputDir: string): Promise<void> {
  const audioDir = path.join(outputDir, "audio");
  const visualsPath = path.join(outputDir, "visuals.json");

  // Node.js 侧计算有音频的场景（Remotion browser bundle 无法 import fs）
  const hasAudioSceneIds = script.scenes
    .filter((s) => fs.existsSync(path.join(audioDir, `scene-${s.id}.mp3`)))
    .map((s) => s.id);

  // 读取 visual_spec 映射
  const sceneVisuals: Record<string, VisualSpec> = fs.existsSync(visualsPath)
    ? JSON.parse(fs.readFileSync(visualsPath, "utf-8"))
    : {};

  const visualCount = Object.keys(sceneVisuals).length;
  console.log(`  音频场景: ${hasAudioSceneIds.length} 个，visual_spec: ${visualCount} 个`);

  // bundle 缓存
  const bundleCacheDir = path.resolve("output", ".remotion-bundle");
  console.log("  打包 Remotion composition...");

  const bundleLocation = await bundle({
    entryPoint: path.resolve("src/remotion/Root.tsx"),
    outDir: bundleCacheDir,
    onProgress: (progress) => {
      process.stdout.write(`\r  打包进度: ${Math.round(progress * 100)}%`);
    },
  });
  console.log("\n  打包完成");

  // 软链接 audio/ 到 bundle public/
  const bundlePublicDir = path.join(bundleLocation, "public");
  fs.mkdirSync(bundlePublicDir, { recursive: true });
  const audioLink = path.join(bundlePublicDir, "audio");
  fs.rmSync(audioLink, { recursive: true, force: true });
  if (fs.existsSync(audioDir)) {
    fs.symlinkSync(path.resolve(audioDir), audioLink);
  }

  const inputProps = {
    scenes: script.scenes,
    hasAudioSceneIds,
    sceneVisuals, // Record<sceneId, VisualSpec>
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "VideoComposition",
    inputProps,
  });

  const outputLocation = path.join(outputDir, "final.mp4");
  console.log("  开始渲染视频...");

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  渲染进度: ${Math.round(progress * 100)}%`);
    },
  });

  console.log(`\n  视频已输出: ${outputLocation}`);
}
