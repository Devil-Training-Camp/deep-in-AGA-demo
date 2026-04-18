import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { type FlowDiagram } from "../../visual-schema";

const DEFAULT_COLORS = ["#6366f1", "#a855f7", "#38bdf8", "#34d399", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16"];

// 自动布局：多列排布节点
function autoLayout(nodes: FlowDiagram["nodes"]): Map<string, { x: number; y: number }> {
  const W = 1920;
  const H = 580;
  const n = nodes.length;
  const cols = Math.ceil(Math.sqrt(n * 1.6));
  const rows = Math.ceil(n / cols);
  const cellW = (W - 120) / cols;
  const cellH = (H - 80) / rows;

  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    pos.set(node.id, {
      x: 60 + col * cellW + cellW / 2,
      y: 40 + row * cellH + cellH / 2,
    });
  });
  return pos;
}

export const FlowViz: React.FC<{ spec: FlowDiagram }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { nodes, edges } = spec;
  const pos = autoLayout(nodes);

  const NODE_FRAMES = 10;
  const EDGE_OFFSET = nodes.length * 6;

  return (
    <svg viewBox="0 0 1920 580" width={1920} height={580} style={{ display: "block" }}>
      <defs>
        <marker id="flow-arr" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(99,102,241,0.8)" />
        </marker>
      </defs>

      {/* 边 */}
      {edges.map((edge, ei) => {
        const from = pos.get(edge.from);
        const to = pos.get(edge.to);
        if (!from || !to) return null;
        const appear = interpolate(frame, [EDGE_OFFSET + ei * 6, EDGE_OFFSET + ei * 6 + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len;
        const uy = dy / len;
        const pad = 52; // 节点半径
        const x1 = from.x + ux * pad;
        const y1 = from.y + uy * pad;
        const x2 = to.x - ux * pad;
        const y2 = to.y - uy * pad;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        return (
          <g key={ei} opacity={appear}>
            <line
              x1={x1} y1={y1}
              x2={x1 + (x2 - x1) * appear} y2={y1 + (y2 - y1) * appear}
              stroke="rgba(99,102,241,0.55)"
              strokeWidth={2}
              strokeDasharray={edge.dashed ? "8 4" : "none"}
              markerEnd={appear > 0.9 ? "url(#flow-arr)" : undefined}
            />
            {edge.label && appear > 0.8 && (
              <text
                x={midX}
                y={midY - 10}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={15}
                fontFamily="system-ui, 'PingFang SC', sans-serif"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {/* 节点 */}
      {nodes.map((node, ni) => {
        const p = pos.get(node.id);
        if (!p) return null;
        const color = node.color ?? DEFAULT_COLORS[ni % DEFAULT_COLORS.length];
        const appear = interpolate(frame, [ni * 6, ni * 6 + NODE_FRAMES], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <g key={node.id} opacity={appear}>
            <circle cx={p.x} cy={p.y} r={48} fill={`${color}20`} stroke={color} strokeWidth={2} />
            <text
              x={p.x}
              y={p.y + 7}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize={17}
              fontFamily="system-ui, 'PingFang SC', sans-serif"
              fontWeight={600}
            >
              {node.label.length > 8 ? node.label.slice(0, 8) + "…" : node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
