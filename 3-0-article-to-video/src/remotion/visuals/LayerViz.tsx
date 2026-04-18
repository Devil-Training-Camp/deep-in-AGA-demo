import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { type LayerDiagram } from "../../visual-schema";

const DEFAULT_COLORS = ["#6366f1", "#a855f7", "#38bdf8", "#34d399", "#f59e0b", "#ef4444"];

export const LayerViz: React.FC<{ spec: LayerDiagram }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { layers } = spec;
  const n = layers.length;

  // 尺寸
  const W = 1920;
  const H = 580;
  const layerH = Math.min(100, (H - 40) / n);
  const totalH = layerH * n;
  const startY = (H - totalH) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }}>
      {layers.map((layer, i) => {
        const color = layer.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const y = startY + i * layerH;
        // 从上到下依次出现
        const appear = interpolate(frame, [i * 10, i * 10 + 18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const slideX = interpolate(appear, [0, 1], [-60, 0]);

        const nodeCount = layer.nodes.length;
        const nodeW = nodeCount > 0 ? Math.min(280, (W - 360) / nodeCount) : 0;
        const nodesAreaX = 320; // 标签右侧开始

        return (
          <g key={i} opacity={appear} transform={`translateX(${slideX})`}>
            {/* 左侧层标签区 */}
            <rect
              x={16}
              y={y + 4}
              width={280}
              height={layerH - 8}
              rx={8}
              fill={`${color}22`}
              stroke={color}
              strokeWidth={2}
            />
            <text
              x={16 + 140}
              y={y + layerH / 2 + 7}
              textAnchor="middle"
              fill={color}
              fontSize={20}
              fontFamily="system-ui, 'PingFang SC', sans-serif"
              fontWeight={700}
            >
              {layer.label}
            </text>

            {/* 节点卡片 */}
            {layer.nodes.map((node, ni) => {
              const nx = nodesAreaX + ni * (nodeW + 16);
              const nh = layerH - 12;
              return (
                <g key={ni}>
                  <rect
                    x={nx}
                    y={y + 6}
                    width={nodeW}
                    height={nh}
                    rx={6}
                    fill={`${color}18`}
                    stroke={`${color}60`}
                    strokeWidth={1}
                  />
                  <text
                    x={nx + nodeW / 2}
                    y={y + 6 + nh / 2 + (node.sublabel ? -8 : 7)}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={18}
                    fontFamily="system-ui, 'PingFang SC', sans-serif"
                    fontWeight={600}
                  >
                    {node.label}
                  </text>
                  {node.sublabel && (
                    <text
                      x={nx + nodeW / 2}
                      y={y + 6 + nh / 2 + 14}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize={14}
                      fontFamily="system-ui, 'PingFang SC', sans-serif"
                    >
                      {node.sublabel}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};
