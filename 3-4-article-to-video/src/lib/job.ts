import fs from "node:fs";
import path from "node:path";
import { sha256 } from "./hash";

/**
 * job 标识与目录初始化（requirements.md §多任务隔离 / §产物文件组织）。
 * 一篇文章对应一个独立 job 目录，彼此隔离，天然支持并行。
 */

/**
 * 由文章生成文件名安全的 jobId：`slug-内容哈希`。
 *
 * **不含日期**：内容哈希后缀已保证唯一性与变更检测，同一篇文章无论哪天跑都得到同一
 * jobId（同一 job 目录），断点续跑才能跨天生效；内容一变哈希就变 → 新 job、全量重跑。
 * 中文标题做目录名不安全，退化为「首个 H1 的 ASCII 片段 + 哈希」，中文转拼音留待后续。
 */
export function deriveJobId(sourceMarkdown: string): string {
  const slug = slugify(firstHeading(sourceMarkdown));
  const suffix = sha256(sourceMarkdown).slice(0, 8);
  return slug ? `${slug}-${suffix}` : `article-${suffix}`;
}

function firstHeading(md: string): string {
  for (const line of md.split("\n")) {
    const m = /^#\s+(.+)$/.exec(line.trim());
    if (m && m[1]) return m[1];
  }
  return "";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** 创建 job 根目录及 audio/clips 子目录（幂等）。 */
export function ensureJobDirs(root: string): void {
  fs.mkdirSync(path.join(root, "audio"), { recursive: true });
  fs.mkdirSync(path.join(root, "clips"), { recursive: true });
}

/** 把输入文章副本写入 job 目录，作为该次运行的不可变输入快照。 */
export function copySource(sourcePath: string, destPath: string): string {
  const md = fs.readFileSync(sourcePath, "utf8");
  fs.writeFileSync(destPath, md, "utf8");
  return md;
}
