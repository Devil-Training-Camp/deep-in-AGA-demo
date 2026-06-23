import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { type TitleSceneData } from "../../src/schema/scene";
import { theme } from "../theme";

/** 标题卡：标题 + 副标题，轻微上移入场（淡入由 SceneFrame 统一负责）。 */
export function TitleSceneView({ scene }: { scene: TitleSceneData }) {
  const frame = useCurrentFrame();
  const translateY = interpolate(frame, [0, 18], [24, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: theme.paddingPx,
        color: theme.colors.fg,
        fontFamily: theme.fontFamily,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div style={{ fontSize: theme.fontSize.title, fontWeight: 700 }}>{scene.title}</div>
      {scene.subtitle ? (
        <div
          style={{
            marginTop: 24,
            fontSize: theme.fontSize.subtitle,
            color: theme.colors.muted,
          }}
        >
          {scene.subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
