import { Composition } from "remotion";
import { Scene } from "./Scene";
import { computeDurationInFrames, type SceneInputProps } from "./props";
import { VIDEO } from "./theme";

/** 默认 inputProps：Studio 预览与 selectComposition 缺省值，渲染时由 pipeline 覆盖。 */
const defaultProps: SceneInputProps = {
  scene: {
    type: "title",
    id: "scene-001",
    narration: "",
    estimatedDuration: 3,
    title: "示例标题卡",
    subtitle: "Scene composition 预览",
    minAnimDurationSec: 3, // 让 Studio 预览有合理时长（静音场景纯由动画定长）
  },
  audioDurationSec: 0,
  paddingSec: 0.4,
};

/**
 * 所有场景共用一个 "Scene" composition，渲染时按 inputProps 切换内容。
 * `calculateMetadata` 据音频时长动态算 durationInFrames，落实混合时间轴。
 */
export function RemotionRoot() {
  return (
    <Composition
      id="Scene"
      component={Scene}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      durationInFrames={computeDurationInFrames(defaultProps)}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: computeDurationInFrames(props),
      })}
    />
  );
}
