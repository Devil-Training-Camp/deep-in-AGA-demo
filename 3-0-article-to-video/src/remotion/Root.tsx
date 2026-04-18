import React from "react";
import { AbsoluteFill, Composition, Sequence, useVideoConfig, registerRoot } from "remotion";
import { type Scene } from "../schema";
import { type VisualSpec } from "../visual-schema";
import { TitleCard } from "./scenes/TitleCard";
import { Narration } from "./scenes/Narration";
import { CodeScene } from "./scenes/CodeScene";
import { BRoll } from "./scenes/BRoll";

export interface CompositionProps {
  scenes: Scene[];
  hasAudioSceneIds: number[];
  sceneVisuals: Record<string, VisualSpec>; // key = scene.id (string)
}

const SceneRenderer: React.FC<{
  scene: Scene;
  hasAudio: boolean;
  visual: VisualSpec | null;
}> = ({ scene, hasAudio, visual }) => {
  switch (scene.type) {
    case "title-card":
      return <TitleCard scene={scene} />;
    case "narration":
      return <Narration scene={scene} hasAudio={hasAudio} visual={visual} />;
    case "code":
      return <CodeScene scene={scene} hasAudio={hasAudio} />;
    case "broll":
      return <BRoll scene={scene} hasAudio={hasAudio} visual={visual} />;
    default:
      return null;
  }
};

export const VideoComposition: React.FC<CompositionProps> = ({
  scenes,
  hasAudioSceneIds,
  sceneVisuals,
}) => {
  const { fps } = useVideoConfig();
  const audioSet = new Set(hasAudioSceneIds);

  const sceneFrames = scenes.reduce<Array<{ scene: Scene; from: number }>>(
    (acc, scene) => {
      const prev = acc[acc.length - 1];
      const from = prev ? prev.from + Math.round(prev.scene.duration * fps) : 0;
      return [...acc, { scene, from }];
    },
    []
  );

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {sceneFrames.map(({ scene, from }) => (
        <Sequence
          key={scene.id}
          from={from}
          durationInFrames={Math.round(scene.duration * fps)}
        >
          <SceneRenderer
            scene={scene}
            hasAudio={audioSet.has(scene.id)}
            visual={sceneVisuals[String(scene.id)] ?? null}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  const placeholderProps: CompositionProps = {
    scenes: [{ id: 1, type: "title-card", narration: "", duration: 3 }],
    hasAudioSceneIds: [],
    sceneVisuals: {},
  };

  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      durationInFrames={90}
      fps={30}
      width={Number(process.env.VIDEO_WIDTH) || 1920}
      height={Number(process.env.VIDEO_HEIGHT) || 1080}
      defaultProps={placeholderProps}
      calculateMetadata={async ({ props }) => ({
        durationInFrames: props.scenes.reduce(
          (sum: number, s: Scene) => sum + Math.round(s.duration * 30),
          0
        ),
      })}
    />
  );
};

registerRoot(RemotionRoot);
