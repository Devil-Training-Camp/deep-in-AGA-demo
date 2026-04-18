import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { type Scene } from "../../schema";
import { type VisualSpec } from "../../visual-schema";
import { SequenceViz } from "../visuals/SequenceViz";
import { LayerViz } from "../visuals/LayerViz";
import { FlowViz } from "../visuals/FlowViz";
import { CompareViz } from "../visuals/CompareViz";
import { MindmapViz } from "../visuals/MindmapViz";

function renderVisual(visual: VisualSpec) {
  switch (visual.type) {
    case "sequence": return <SequenceViz spec={visual} />;
    case "layer":    return <LayerViz spec={visual} />;
    case "flow":     return <FlowViz spec={visual} />;
    case "compare":  return <CompareViz spec={visual} />;
    case "mindmap":  return <MindmapViz spec={visual} />;
  }
}

export const Narration: React.FC<{
  scene: Scene;
  hasAudio: boolean;
  visual: VisualSpec | null;
}> = ({ scene, hasAudio, visual }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const safeEnterEnd = Math.min(20, durationInFrames);
  const safeExitStart = Math.max(durationInFrames - 10, safeEnterEnd);

  const enterProgress = interpolate(frame, [0, safeEnterEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [safeExitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = enterProgress * exitOpacity;
  const slideY = interpolate(enterProgress, [0, 1], [24, 0]);

  const hasLayout = visual !== null;

  return (
    <AbsoluteFill style={{ background: "#07070e", flexDirection: "column" }}>
      {/* 细格网 */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <pattern id="nr-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M80 0L0 0 0 80" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#nr-grid)" />
      </svg>

      {hasLayout ? (
        /* ── 上图下字布局 ── */
        <>
          {/* 插图区域（上 58%） */}
          <div
            style={{
              height: "58%",
              overflow: "hidden",
              opacity,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 40px 0",
            }}
          >
            {renderVisual(visual!)}
          </div>

          {/* 分割线 */}
          <div
            style={{
              height: 1,
              margin: "0 80px",
              background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)",
              opacity,
            }}
          />

          {/* 旁白文字区域（下 42%） */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 120px",
              opacity,
              transform: `translateY(${slideY}px)`,
            }}
          >
            <p
              style={{
                color: "#e2e8f0",
                fontSize: 42,
                lineHeight: 1.65,
                margin: 0,
                textAlign: "center",
                fontFamily:
                  "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
              }}
            >
              {scene.narration}
            </p>
          </div>
        </>
      ) : (
        /* ── 纯文字居中布局（无插图回退） ── */
        <>
          <div
            style={{
              position: "absolute",
              left: 88,
              top: "28%",
              bottom: "28%",
              width: 2,
              background: "linear-gradient(to bottom, transparent, rgba(99,102,241,0.5), transparent)",
              opacity,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 88,
              top: "28%",
              bottom: "28%",
              width: 2,
              background: "linear-gradient(to bottom, transparent, rgba(168,85,247,0.5), transparent)",
              opacity,
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 160px",
              opacity,
              transform: `translateY(${slideY}px)`,
            }}
          >
            <p
              style={{
                color: "#e2e8f0",
                fontSize: 54,
                lineHeight: 1.7,
                margin: 0,
                textAlign: "center",
                fontFamily:
                  "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
              }}
            >
              {scene.narration}
            </p>
          </div>
        </>
      )}

      {/* 底部进度条 */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.05)" }}>
        <div
          style={{
            height: "100%",
            width: `${(frame / Math.max(durationInFrames, 1)) * 100}%`,
            background: "linear-gradient(90deg, #6366f1, #a855f7)",
          }}
        />
      </div>

      {hasAudio && <Audio src={staticFile(`audio/scene-${scene.id}.mp3`)} />}
    </AbsoluteFill>
  );
};
