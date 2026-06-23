import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { type ImageSceneData } from "../../src/schema/scene";
import { theme } from "../theme";

/**
 * 配图：文章自带图 + 缓慢推拉（Ken Burns）。
 * imagePath 由 pipeline（render-input）转成 job 内相对路径（本地图，经 staticFile 解析，
 * step5 已拷贝进 job 目录）或保持远程 URL（直接加载）。
 */
export function ImageSceneView({ scene }: { scene: ImageSceneData }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1.04, 1.12], {
    extrapolateRight: "clamp",
  });
  const src = /^https?:\/\//i.test(scene.imagePath)
    ? scene.imagePath
    : staticFile(scene.imagePath);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: theme.paddingPx,
        color: theme.colors.muted,
        fontFamily: theme.fontFamily,
      }}
    >
      <Img
        src={src}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          transform: `scale(${scale})`,
        }}
      />
      {scene.caption ? (
        <div
          style={{
            position: "absolute",
            bottom: theme.paddingPx,
            fontSize: theme.fontSize.caption,
          }}
        >
          {scene.caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
