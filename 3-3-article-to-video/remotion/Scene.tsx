import { AbsoluteFill, Audio, staticFile } from "remotion";
import { type SceneInputProps } from "./props";
import { SceneFrame } from "./scenes/SceneFrame";
import { TitleSceneView } from "./scenes/TitleSceneView";
import { NarrationSceneView } from "./scenes/NarrationSceneView";
import { CodeSceneView } from "./scenes/CodeSceneView";
import { ImageSceneView } from "./scenes/ImageSceneView";

/**
 * "Scene" composition 的根组件：按 scene.type 分发到对应视图，
 * 视觉部分用 SceneFrame 包裹（统一背景 + 段内淡入淡出），音轨不参与淡入淡出。
 * 每个场景对应一个 composition（technical-design.md §Remotion）。
 */
export function Scene({ scene }: SceneInputProps) {
  return (
    <AbsoluteFill>
      <SceneFrame>{renderView(scene)}</SceneFrame>
      {scene.audio?.path ? <Audio src={staticFile(scene.audio.path)} /> : null}
    </AbsoluteFill>
  );
}

function renderView(scene: SceneInputProps["scene"]) {
  switch (scene.type) {
    case "title":
      return <TitleSceneView scene={scene} />;
    case "narration":
      return <NarrationSceneView scene={scene} />;
    case "code":
      return <CodeSceneView scene={scene} />;
    case "image":
      return <ImageSceneView scene={scene} />;
    default: {
      // 穷尽性检查：新增场景类型而漏处理时此处编译报错
      const _exhaustive: never = scene;
      return _exhaustive;
    }
  }
}
