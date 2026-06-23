import path from "node:path";
import { type Config } from "../lib/config";
import { type EnrichedScene, type Scene, type SceneAudio } from "../schema/scene";
import { type SceneInputProps } from "../../remotion/props";

/**
 * Remotion 渲染输入的单一组装点（R4/R5/R6）。
 *
 * 资产加载用 `publicDir` + `staticFile`：渲染时把 job 目录作为 publicDir，
 * 音频用相对路径 `audio/<id>.mp3`、图片用 `images/<id><ext>`（step5 拷贝进来），
 * 组件侧 staticFile 解析。这样 chromium 经 http 源能正常取到本地文件
 * （而非 file:// 被同源策略拦）。
 *
 * minAnimDurationSec 和资产相对路径都是渲染输入但不属 ScriptSchema，故不落盘、在此现算。
 */

/** 原始图绝对路径（step5 拷贝时定位源文件用）；远程 URL / 绝对路径原样返回。 */
export function resolveImagePath(articleDir: string, imagePath: string): string {
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (path.isAbsolute(imagePath)) return imagePath;
  return path.resolve(articleDir, imagePath);
}

/**
 * 本地图在 job 目录内的相对路径（供 staticFile 与 step5 拷贝目标共用，命名一致）；
 * 远程图返回 null（不拷贝，渲染直接用原 URL）。
 */
export function jobImageRelPath(scene: { id: string; imagePath: string }): string | null {
  if (/^https?:\/\//i.test(scene.imagePath)) return null;
  return `images/${scene.id}${path.extname(scene.imagePath)}`;
}

/** 场景最短动画时长：托底静音/短音频场景；滚动代码按行数放大。 */
export function deriveMinAnimSec(scene: Scene, config: Config): number {
  if (scene.type === "code" && scene.scroll) {
    const lines = scene.code.split("\n").length;
    return Math.max(config.minSceneSec, lines * config.codeScrollSecPerLine);
  }
  return config.minSceneSec;
}

/**
 * 组装单场景的 Remotion inputProps。
 * 音轨与算帧同取自 sidecar.durationSec（R4）；paddingSec 显式取 config（R5）；
 * 资产路径转成 publicDir 相对（R6）。dry-run（sidecar.path 为空串）下不挂音轨。
 */
export function buildSceneInputProps(
  scene: EnrichedScene,
  sidecar: SceneAudio | null,
  config: Config,
): SceneInputProps {
  let renderScene: EnrichedScene = scene;
  if (scene.type === "image") {
    const rel = jobImageRelPath(scene);
    renderScene = { ...scene, imagePath: rel ?? scene.imagePath };
  }

  const audio: SceneAudio | undefined = sidecar
    ? { ...sidecar, path: sidecar.path ? `audio/${scene.id}.mp3` : "" }
    : undefined;

  return {
    scene: { ...renderScene, audio, minAnimDurationSec: deriveMinAnimSec(scene, config) },
    audioDurationSec: sidecar?.durationSec ?? 0,
    paddingSec: config.scenePaddingSec,
  };
}
