import { type EnrichedScene } from "../src/schema/scene";
import { VIDEO, DEFAULT_PADDING_SEC } from "./theme";

/**
 * 传给 "Scene" composition 的 inputProps。
 * 音频时长由 pipeline 侧 ffprobe 量取后注入，Remotion 不自行探测
 * （technical-design.md §Remotion）。
 */
// 用 type（而非 interface）：Remotion 的 Composition 要求 props 可赋值给
// Record<string, unknown>，type 字面量满足隐式索引签名而 interface 不满足。
export type SceneInputProps = {
  scene: EnrichedScene;
  /** 该场景音频实际时长（秒）；静音场景为 0 */
  audioDurationSec: number;
  /** 场景留白（秒），缺省取默认值 */
  paddingSec?: number;
};

/**
 * 混合时间轴换算：`durationInFrames = ceil((max(音频, 动画下限) + 留白) × fps)`
 * （requirements.md §时间轴规则）。供 calculateMetadata 使用。
 */
export function computeDurationInFrames(props: SceneInputProps): number {
  const { scene, audioDurationSec, paddingSec = DEFAULT_PADDING_SEC } = props;
  const minAnim = scene.minAnimDurationSec ?? 0;
  const seconds = Math.max(audioDurationSec, minAnim) + paddingSec;
  return Math.max(1, Math.ceil(seconds * VIDEO.fps));
}
