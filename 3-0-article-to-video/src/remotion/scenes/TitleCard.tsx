import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { type Scene } from "../../schema";

// 四角装饰方括号
const CornerBracket: React.FC<{
  pos: "tl" | "tr" | "bl" | "br";
  progress: number;
}> = ({ pos, progress }) => {
  const size = interpolate(progress, [0, 1], [0, 48]);
  const opacity = progress;
  const base: React.CSSProperties = { position: "absolute", width: size, height: size, opacity };
  const border = "2px solid rgba(99,102,241,0.7)";
  const positions = {
    tl: { top: 64, left: 64, borderTop: border, borderLeft: border },
    tr: { top: 64, right: 64, borderTop: border, borderRight: border },
    bl: { bottom: 64, left: 64, borderBottom: border, borderLeft: border },
    br: { bottom: 64, right: 64, borderBottom: border, borderRight: border },
  };
  return <div style={{ ...base, ...positions[pos] }} />;
};

export const TitleCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const enterProgress = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleY = interpolate(enterProgress, [0, 1], [40, 0]);
  const lineW = interpolate(enterProgress, [0, 1], [0, 320]);
  const opacity = enterProgress * exitOpacity;

  return (
    <AbsoluteFill
      style={{ background: "#08080f", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* 细格网背景 */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <pattern id="tc-grid" width="72" height="72" patternUnits="userSpaceOnUse">
            <path d="M72 0L0 0 0 72" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tc-grid)" />
        {/* 中心十字辅助线 */}
        <line x1="0" y1="540" x2="1920" y2="540" stroke="rgba(99,102,241,0.06)" strokeWidth="1" />
        <line x1="960" y1="0" x2="960" y2="1080" stroke="rgba(99,102,241,0.06)" strokeWidth="1" />
      </svg>

      {/* 四角装饰 */}
      {(["tl", "tr", "bl", "br"] as const).map((p) => (
        <CornerBracket key={p} pos={p} progress={enterProgress} />
      ))}

      {/* 主内容 */}
      <div style={{ textAlign: "center", opacity, zIndex: 10, padding: "0 140px" }}>
        {/* 上方装饰线 */}
        <div
          style={{
            height: 2,
            width: lineW,
            background: "linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)",
            margin: "0 auto 48px",
          }}
        />

        <h1
          style={{
            transform: `translateY(${titleY}px)`,
            color: "#f1f5f9",
            fontSize: 80,
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            fontFamily:
              "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
          }}
        >
          {scene.narration || "技术视频"}
        </h1>

        {/* 下方装饰线 */}
        <div
          style={{
            height: 2,
            width: lineW,
            background: "linear-gradient(90deg, transparent, #a855f7, #6366f1, transparent)",
            margin: "48px auto 0",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
