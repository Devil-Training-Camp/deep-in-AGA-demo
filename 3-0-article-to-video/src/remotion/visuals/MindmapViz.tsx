import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { type MindmapDiagram } from "../../visual-schema";

const W = 1920;
const H = 580;
const CX = W / 2;
const CY = H / 2;

// Colors for branches
const COLORS = ["#6366f1", "#a855f7", "#38bdf8", "#34d399", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16"];

export const MindmapViz: React.FC<{ spec: MindmapDiagram }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { center, branches } = spec;
  const n = branches.length;

  // Center node appears first
  const centerAppear = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Place branches evenly around center
  const branchRadius = 280;
  const branchPositions = branches.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return {
      x: CX + branchRadius * Math.cos(angle),
      y: CY + branchRadius * Math.sin(angle),
      angle,
    };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }}>
      {/* Lines from center to branches */}
      {branches.map((branch, i) => {
        const pos = branchPositions[i];
        const color = COLORS[i % COLORS.length];
        const lineAppear = interpolate(frame, [12 + i * 6, 12 + i * 6 + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const endX = CX + (pos.x - CX) * lineAppear;
        const endY = CY + (pos.y - CY) * lineAppear;

        return (
          <line
            key={`line-${i}`}
            x1={CX}
            y1={CY}
            x2={endX}
            y2={endY}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.5}
            opacity={lineAppear}
          />
        );
      })}

      {/* Leaf item lines from branches */}
      {branches.map((branch, i) => {
        if (!branch.items || branch.items.length === 0) return null;
        const pos = branchPositions[i];
        const color = COLORS[i % COLORS.length];
        const branchAppear = interpolate(frame, [20 + i * 6, 20 + i * 6 + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Spread leaves outward from branch
        const leafCount = branch.items.length;
        const leafRadius = 120;
        const leafAngleSpread = Math.min(0.7, (leafCount * 0.25));
        const leafStartAngle = pos.angle - leafAngleSpread / 2;

        return branch.items.map((item, li) => {
          const leafAngle = leafCount === 1
            ? pos.angle
            : leafStartAngle + (li / (leafCount - 1)) * leafAngleSpread;
          const lx = pos.x + leafRadius * Math.cos(leafAngle);
          const ly = pos.y + leafRadius * Math.sin(leafAngle);

          // Clamp to canvas bounds
          const clampedLx = Math.max(80, Math.min(W - 80, lx));
          const clampedLy = Math.max(20, Math.min(H - 20, ly));

          const leafAppear = interpolate(
            frame,
            [24 + i * 6 + li * 4, 24 + i * 6 + li * 4 + 10],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <g key={`leaf-${i}-${li}`} opacity={leafAppear * branchAppear}>
              <line
                x1={pos.x}
                y1={pos.y}
                x2={clampedLx}
                y2={clampedLy}
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.3}
                strokeDasharray="4 3"
              />
              <text
                x={clampedLx}
                y={clampedLy}
                textAnchor={clampedLx < CX ? "end" : clampedLx > CX ? "start" : "middle"}
                fill="#94a3b8"
                fontSize={15}
                fontFamily="system-ui, 'PingFang SC', sans-serif"
              >
                {item}
              </text>
            </g>
          );
        });
      })}

      {/* Branch nodes */}
      {branches.map((branch, i) => {
        const pos = branchPositions[i];
        const color = COLORS[i % COLORS.length];
        const appear = interpolate(frame, [16 + i * 6, 16 + i * 6 + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const labelLen = branch.label.length;
        const boxW = Math.max(100, labelLen * 14 + 24);
        const boxH = 40;

        return (
          <g key={`branch-${i}`} opacity={appear}>
            <rect
              x={pos.x - boxW / 2}
              y={pos.y - boxH / 2}
              width={boxW}
              height={boxH}
              rx={20}
              fill={`${color}22`}
              stroke={color}
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y + 6}
              textAnchor="middle"
              fill={color}
              fontSize={17}
              fontWeight={600}
              fontFamily="system-ui, 'PingFang SC', sans-serif"
            >
              {branch.label}
            </text>
          </g>
        );
      })}

      {/* Center node */}
      <g opacity={centerAppear}>
        <circle cx={CX} cy={CY} r={72} fill="rgba(99,102,241,0.18)" stroke="#6366f1" strokeWidth={3} />
        <text
          x={CX}
          y={CY + 7}
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize={22}
          fontWeight={700}
          fontFamily="system-ui, 'PingFang SC', sans-serif"
        >
          {center.length > 10 ? center.slice(0, 10) + "…" : center}
        </text>
      </g>
    </svg>
  );
};
