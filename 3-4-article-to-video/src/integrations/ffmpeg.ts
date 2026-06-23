import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpegStaticPath from "ffmpeg-static";
import { logger } from "../lib/logger";

/**
 * ffmpeg 集成（步骤 8 片段拼接）。
 *
 * ffmpeg 二进制解析回退链：环境变量 `FFMPEG_PATH` → 系统/brew 安装的 ffmpeg →
 * `ffmpeg-static` 自带二进制 → PATH 中的 `ffmpeg`。
 * （Apple Silicon 上 ffmpeg-static 的下载式二进制可能因未签名被 Gatekeeper 拦截，
 * 故优先系统 ffmpeg——`brew install ffmpeg` 即可，无需手动设 FFMPEG_PATH。）
 *
 * 各 clip 由 step6 渲染时已统一编码参数（h264/aac/yuv420p/30fps/1080p），
 * 故优先用 concat demuxer `-c copy` 无重编码；失败再降级统一 re-encode。
 */
function resolveFfmpeg(): string {
  const env = process.env.FFMPEG_PATH;
  if (env && fs.existsSync(env)) return env;
  for (const p of ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"]) {
    if (fs.existsSync(p)) return p;
  }
  if (ffmpegStaticPath && fs.existsSync(ffmpegStaticPath)) return ffmpegStaticPath;
  return "ffmpeg"; // 退到 PATH
}

/** 把若干 clip 顺序拼成一个 mp4。listFilePath 为 concat list 临时文件路径（写在 job 目录）。 */
export async function concatClips(
  clipPaths: string[],
  outPath: string,
  listFilePath: string,
): Promise<void> {
  if (clipPaths.length === 0) {
    throw new Error("没有可拼接的 clip");
  }
  const ffmpeg = resolveFfmpeg();

  // 用绝对路径：concat demuxer 的 `file '...'` 是相对 list 文件所在目录解析的，
  // 而 list 就在 job 目录里，写相对路径会与 job 目录二次拼接 → 路径翻倍。
  const list = clipPaths
    .map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`)
    .join("\n");
  fs.writeFileSync(listFilePath, list, "utf8");

  const baseArgs = ["-y", "-f", "concat", "-safe", "0", "-i", listFilePath];
  try {
    await run(ffmpeg, [...baseArgs, "-c", "copy", outPath]);
  } catch {
    logger.warn("concat -c copy 失败，降级为统一 re-encode");
    await run(ffmpeg, [
      ...baseArgs,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      outPath,
    ]);
  }
}

function run(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg 退出码 ${code}：${stderr.slice(-500)}`));
    });
  });
}
