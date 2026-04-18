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

export const BRoll: React.FC<{
  scene: Scene;
  hasAudio: boolean;
  visual: VisualSpec | null;
}> = ({ scene, hasAudio, visual }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const safeExitStart = Math.max(durationInFrames - 12, 0);
  const exitOpacity = interpolate(frame, [safeExitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textEnter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#06060f" }}>
      {/* 全屏动态图示 */}
      {visual && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: scene.narration ? "0 0 220px" : 0,
            opacity: exitOpacity,
          }}
        >
          {renderVisual(visual)}
        </div>
      )}

      {/* 无插图时的网格背景 */}
      {!visual && (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <defs>
            <pattern id="br-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M80 0L0 0 0 80" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#br-grid)" />
        </svg>
      )}

      {/* 旁白文字卡片 — 底部居中 */}
      {scene.narration && (
        <div
          style={{
            position: "absolute",
            bottom: 64,
            left: 160,
            right: 160,
            opacity: textEnter * exitOpacity,
          }}
        >
          <div
            style={{
              background: "rgba(6,6,15,0.88)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: 14,
              padding: "36px 56px",
            }}
          >
            <p
              style={{
                color: "#e2e8f0",
                fontSize: 44,
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
        </div>
      )}

      {hasAudio && <Audio src={staticFile(`audio/scene-${scene.id}.mp3`)} />}
    </AbsoluteFill>
  );
};
