import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/logger";
import { loadScriptEnriched } from "./script-io";
import { resolveImagePath, jobImageRelPath, deriveMinAnimSec } from "./render-input";
import { type PipelineContext } from "./context";

/**
 * 步骤 5：视觉素材生成（自动，不计费，可与 step4 并行）。
 *
 * - image 场景：本地图相对原始文章目录解析并校验存在，**拷贝进 job 目录**
 *   （`images/<id><ext>`），供渲染期 staticFile 取用、并使 job 自洽；缺图在此报错。
 *   远程图不拷贝，渲染时直接用 URL。
 * - code 场景：算出 minAnim 供观察（实际渲染输入由 step6 经 buildSceneInputProps 现算）。
 */
export async function step5Visuals(ctx: PipelineContext): Promise<void> {
  logger.step("[5/8] 视觉素材生成");
  const scenes = loadScriptEnriched(ctx.paths.script);

  for (const scene of scenes) {
    switch (scene.type) {
      case "image": {
        if (/^https?:\/\//i.test(scene.imagePath)) {
          logger.info(`${scene.id} image：远程 ${scene.imagePath}`);
          break;
        }
        const src = resolveImagePath(ctx.articleDir, scene.imagePath);
        if (!fs.existsSync(src)) {
          throw new Error(
            `${scene.id} 图片不存在：${src}（imagePath=${scene.imagePath}，基准目录=${ctx.articleDir}）`,
          );
        }
        const rel = jobImageRelPath(scene)!; // 本地图必非 null
        const dest = path.join(ctx.paths.root, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        logger.info(`${scene.id} image：${src} → ${rel}`);
        break;
      }
      case "code":
        logger.info(
          `${scene.id} code：${scene.language}${scene.scroll ? "（滚动）" : ""}，minAnim=${deriveMinAnimSec(scene, ctx.config).toFixed(1)}s`,
        );
        break;
      default:
        logger.info(`${scene.id} ${scene.type}：版式由 Remotion 组件渲染，无独立素材`);
    }
  }
}
