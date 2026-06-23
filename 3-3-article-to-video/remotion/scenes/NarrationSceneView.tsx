import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { type NarrationSceneData } from "../../src/schema/scene";
import { theme } from "../theme";

/** 纯旁白：屏幕显示要点 bullets，逐条淡入；无 bullets 时画面留白、以口播为主。 */
export function NarrationSceneView({ scene }: { scene: NarrationSceneData }) {
  const frame = useCurrentFrame();
  const bullets = scene.bullets ?? [];

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: theme.paddingPx,
        gap: 28,
        color: theme.colors.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {bullets.map((text, i) => {
        const opacity = interpolate(frame, [i * 10, i * 10 + 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              fontSize: theme.fontSize.body,
              opacity,
              display: "flex",
              gap: 16,
            }}
          >
            <span style={{ color: theme.colors.accent }}>•</span>
            <span>{text}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
