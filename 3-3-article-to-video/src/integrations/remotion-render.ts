import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { type SceneInputProps } from "../../remotion/props";

/**
 * 浏览器可执行文件:仅认环境变量 REMOTION_BROWSER_EXECUTABLE（须指向
 * chrome-headless-shell,**不能是完整 Chrome**——后者旧 headless 模式已被移除,
 * Remotion 启动会失败）。未设则返回 undefined,由 Remotion 用自带的 headless-shell
 * （预先 `npx remotion browser ensure` 下载并缓存)。
 */
function resolveBrowserExecutable(): string | undefined {
  const env = process.env.REMOTION_BROWSER_EXECUTABLE;
  return env && fs.existsSync(env) ? env : undefined;
}

const BROWSER = resolveBrowserExecutable();

/**
 * Remotion 编程式渲染（步骤 6 逐场景出 clip）。
 *
 * - `bundle()` 一次，serveUrl 缓存复用（不每场景重打包）；
 * - 每场景 `selectComposition` + `renderMedia`，**严格串行**（单个渲染即吃满机器）；
 * - 编码参数固定 h264 / aac / yuv420p，并 enforceAudioTrack——所有 clip 一致，
 *   静音场景也有（静音）音轨，step8 concat 才能 `-c copy`（R7）。
 */

const ENTRY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../remotion/index.ts",
);

const serveUrlCache = new Map<string, string>();

/**
 * 打包 Remotion 工程，返回缓存的 serveUrl。
 * publicDir 指向该 job 目录：组件里的 staticFile 据此解析音频/图片本地文件
 * （Remotion 的 publicDir 在 bundle 时确定，不能在 render 时改）。按 publicDir 缓存，
 * 一次 pipeline 运行只有一个 job，故只打包一次。
 */
export async function getServeUrl(publicDir: string): Promise<string> {
  let url = serveUrlCache.get(publicDir);
  if (!url) {
    url = await bundle({ entryPoint: ENTRY, publicDir });
    serveUrlCache.set(publicDir, url);
  }
  return url;
}

/** 渲染单个场景为 mp4。inputProps 与 selectComposition / renderMedia 用同一份。 */
export async function renderScene(
  serveUrl: string,
  inputProps: SceneInputProps,
  outPath: string,
): Promise<void> {
  const composition = await selectComposition({
    serveUrl,
    id: "Scene",
    inputProps,
    browserExecutable: BROWSER,
  });
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    enforceAudioTrack: true,
    browserExecutable: BROWSER,
    outputLocation: outPath,
  });
}
