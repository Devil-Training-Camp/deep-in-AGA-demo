import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { type SequenceDiagram } from "../../visual-schema";

const COLORS = ["#6366f1", "#a855f7", "#38bdf8", "#34d399"];
const W = 1920;
const H = 580;

export const SequenceViz: React.FC<{ spec: SequenceDiagram }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { actors, messages } = spec;
  const n = actors.length;

  // 每个 actor 的 x 坐标
  const actorX = (i: number) => 180 + (i * (W - 360)) / Math.max(n - 1, 1);
  const headerY = 64;
  const lineStartY = 120;
  const lineEndY = H - 40;

  // 消息逐条出现：每条消息占 12 帧
  const MSG_FRAMES = 14;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }}>
      {/* Actor 头部方框 */}
      {actors.map((a, i) => {
        const x = actorX(i);
        const color = COLORS[i % COLORS.length];
        const appear = interpolate(frame, [i * 4, i * 4 + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <g key={a.id} opacity={appear}>
            <rect
              x={x - 90}
              y={headerY - 24}
              width={180}
              height={48}
              rx={8}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            <text
              x={x}
              y={headerY + 8}
              textAnchor="middle"
              fill={color}
              fontSize={22}
              fontFamily="system-ui, 'PingFang SC', sans-serif"
              fontWeight={600}
            >
              {a.label}
            </text>
          </g>
        );
      })}

      {/* Actor 竖生命线 */}
      {actors.map((a, i) => {
        const x = actorX(i);
        const appear = interpolate(frame, [i * 4 + 6, i * 4 + 18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <line
            key={`line-${a.id}`}
            x1={x}
            y1={lineStartY}
            x2={x}
            y2={lineEndY}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={appear}
          />
        );
      })}

      {/* 消息箭头 */}
      <defs>
        <marker id="arr" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(99,102,241,0.9)" />
        </marker>
        <marker id="arr-dashed" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(168,85,247,0.9)" />
        </marker>
      </defs>

      {messages.map((msg, mi) => {
        const fromIdx = actors.findIndex((a) => a.id === msg.from);
        const toIdx = actors.findIndex((a) => a.id === msg.to);
        if (fromIdx < 0 || toIdx < 0) return null;

        const startX = actorX(fromIdx);
        const endX = actorX(toIdx);
        const y = lineStartY + 32 + mi * 42;
        const msgStart = actors.length * 4 + mi * MSG_FRAMES;
        const appear = interpolate(frame, [msgStart, msgStart + MSG_FRAMES], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const midX = startX + (endX - startX) * appear;
        const color = msg.dashed ? "rgba(168,85,247,0.85)" : "rgba(99,102,241,0.85)";

        return (
          <g key={mi} opacity={Math.min(appear * 3, 1)}>
            <line
              x1={startX}
              y1={y}
              x2={midX}
              y2={y}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={msg.dashed ? "8 4" : "none"}
              markerEnd={appear > 0.9 ? (msg.dashed ? "url(#arr-dashed)" : "url(#arr)") : undefined}
            />
            <text
              x={(startX + endX) / 2}
              y={y - 10}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize={18}
              fontFamily="system-ui, 'PingFang SC', sans-serif"
              opacity={appear > 0.7 ? 1 : 0}
            >
              {msg.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
