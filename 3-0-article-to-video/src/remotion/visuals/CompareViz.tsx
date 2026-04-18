import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { type CompareDiagram } from "../../visual-schema";

export const CompareViz: React.FC<{ spec: CompareDiagram }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { left, right } = spec;
  const leftColor = left.color ?? "#ef4444";
  const rightColor = right.color ?? "#22c55e";
  const maxItems = Math.max(left.items.length, right.items.length);

  return (
    <svg viewBox="0 0 1920 580" width={1920} height={580} style={{ display: "block" }}>
      {/* 中央分割线 */}
      {(() => {
        const lineAppear = interpolate(frame, [0, 16], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <line
            x1={960} y1={20}
            x2={960} y2={20 + 540 * lineAppear}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={2}
          />
        );
      })()}

      {/* 左列标题 */}
      {(() => {
        const a = interpolate(frame, [8, 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <g opacity={a}>
            <rect x={200} y={30} width={640} height={60} rx={10}
              fill={`${leftColor}22`} stroke={leftColor} strokeWidth={2.5} />
            <text x={520} y={68} textAnchor="middle"
              fill={leftColor} fontSize={26} fontWeight={700}
              fontFamily="system-ui, 'PingFang SC', sans-serif">
              {left.label}
            </text>
          </g>
        );
      })()}

      {/* 右列标题 */}
      {(() => {
        const a = interpolate(frame, [8, 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <g opacity={a}>
            <rect x={1080} y={30} width={640} height={60} rx={10}
              fill={`${rightColor}22`} stroke={rightColor} strokeWidth={2.5} />
            <text x={1400} y={68} textAnchor="middle"
              fill={rightColor} fontSize={26} fontWeight={700}
              fontFamily="system-ui, 'PingFang SC', sans-serif">
              {right.label}
            </text>
          </g>
        );
      })()}

      {/* 条目 */}
      {Array.from({ length: maxItems }).map((_, i) => {
        const y = 120 + i * 72;
        const itemAppear = interpolate(frame, [22 + i * 8, 22 + i * 8 + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const lItem = left.items[i];
        const rItem = right.items[i];
        return (
          <g key={i} opacity={itemAppear}>
            {lItem && (
              <g transform={`translateX(${interpolate(itemAppear, [0, 1], [-30, 0])})`}>
                <rect x={200} y={y} width={640} height={56} rx={8}
                  fill={`${leftColor}12`} stroke={`${leftColor}40`} strokeWidth={1} />
                <text x={240} y={y + 34} fill="#e2e8f0" fontSize={20}
                  fontFamily="system-ui, 'PingFang SC', sans-serif">
                  {lItem}
                </text>
              </g>
            )}
            {rItem && (
              <g transform={`translateX(${interpolate(itemAppear, [0, 1], [30, 0])})`}>
                <rect x={1080} y={y} width={640} height={56} rx={8}
                  fill={`${rightColor}12`} stroke={`${rightColor}40`} strokeWidth={1} />
                <text x={1120} y={y + 34} fill="#e2e8f0" fontSize={20}
                  fontFamily="system-ui, 'PingFang SC', sans-serif">
                  {rItem}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
