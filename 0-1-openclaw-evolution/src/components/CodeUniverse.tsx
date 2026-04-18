import { useRef, useState, useMemo } from 'react';
import type { FileNode } from '../types';
import { getFileColor, getFileRadius } from '../utils/colors';
import { useD3Force } from '../hooks/useD3Force';

interface Props {
  nodes: FileNode[];
  newNodeIds: Set<string>;
  width: number;
  height: number;
}

// Compute per-directory centroids from current positions
function computeClusterLabels(
  nodes: FileNode[],
  positions: Map<string, { x: number; y: number }>,
): Array<{ dir: string; x: number; y: number; count: number }> {
  const groups = new Map<string, { sx: number; sy: number; count: number }>();
  for (const node of nodes) {
    if (!node.dir) continue;
    const pos = positions.get(node.id);
    if (!pos) continue;
    const g = groups.get(node.dir) ?? { sx: 0, sy: 0, count: 0 };
    g.sx += pos.x; g.sy += pos.y; g.count++;
    groups.set(node.dir, g);
  }
  return Array.from(groups.entries())
    .filter(([, g]) => g.count >= 2)
    .map(([dir, g]) => ({
      dir,
      x: g.sx / g.count,
      y: g.sy / g.count,
      count: g.count,
    }));
}

export function CodeUniverse({ nodes, newNodeIds, width, height }: Props) {
  const positions = useD3Force(nodes, width, height);
  const [tooltip, setTooltip] = useState<{ node: FileNode; svgX: number; svgY: number } | null>(null);

  // Cluster labels: short name from the dir path (last segment)
  const clusterLabels = computeClusterLabels(nodes, positions);

  // Stable star positions — only recompute when viewport size changes
  const stars = useMemo(() => (
    Array.from({ length: 130 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.3,
      op: Math.random() * 0.35 + 0.05,
    }))
  ), [width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0"
      style={{ background: 'transparent' }}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-new" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="bg-grad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0d1b2a" />
          <stop offset="100%" stopColor="#050a10" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#bg-grad)" />

      {/* Starfield */}
      <g>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.op} />
        ))}
      </g>

      {/* Cluster directory labels */}
      <g style={{ pointerEvents: 'none' }}>
        {clusterLabels.map(({ dir, x, y }) => {
          const label = dir.includes('/') ? dir.split('/')[1] : dir;
          return (
            <text
              key={dir}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontFamily="monospace"
              fill="rgba(255,255,255,0.18)"
              fontWeight="500"
              letterSpacing="0.04em"
              style={{ userSelect: 'none' }}
            >
              {label}/
            </text>
          );
        })}
      </g>

      {/* File nodes — CSS transition handles position movement smoothly */}
      {nodes.map(node => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const r = getFileRadius(node.size);
        const color = getFileColor(node.ext);
        const isNew = newNodeIds.has(node.id);

        return (
          <g
            key={node.id}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px)`,
              // Smooth glide as force sim settles — but don't slow down initial burst
              transition: isNew ? 'none' : 'transform 80ms linear',
              cursor: 'pointer',
            }}
            onMouseEnter={() => setTooltip({ node, svgX: pos.x, svgY: pos.y })}
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Halo */}
            <circle r={r * 2.8} fill={color} opacity={0.07} />
            {/* Body */}
            <circle
              r={r}
              fill={color}
              opacity={0.9}
              filter={isNew ? 'url(#glow-new)' : 'url(#glow)'}
            />
            {/* Specular */}
            <circle cx={-r * 0.28} cy={-r * 0.28} r={r * 0.32} fill="white" opacity={0.22} />
            {/* Label on large nodes */}
            {r > 8 && (
              <text
                y={r + 11}
                textAnchor="middle"
                fontSize={9}
                fill={color}
                opacity={0.65}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.name.length > 18 ? node.name.slice(0, 16) + '…' : node.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Tooltip */}
      {tooltip && (
        <FileTooltip
          node={tooltip.node}
          svgX={tooltip.svgX}
          svgY={tooltip.svgY}
          svgWidth={width}
        />
      )}
    </svg>
  );
}

function FileTooltip({ node, svgX, svgY, svgWidth }: {
  node: FileNode;
  svgX: number;
  svgY: number;
  svgWidth: number;
}) {
  const isRight = svgX < svgWidth / 2;
  const x = isRight ? svgX + 14 : svgX - 14;
  const anchor = isRight ? 'start' : 'end';
  const color = getFileColor(node.ext);

  return (
    <g transform={`translate(${x}, ${svgY - 10})`} style={{ pointerEvents: 'none' }}>
      <rect
        x={anchor === 'start' ? -4 : -164}
        y={-18}
        width={168}
        height={44}
        rx={6}
        fill="#0d1117"
        stroke={color}
        strokeOpacity={0.5}
        strokeWidth={1}
      />
      <text fontSize={11} fill={color} textAnchor={anchor} fontFamily="monospace">
        {node.name}
      </text>
      <text y={16} fontSize={10} fill="#8b949e" textAnchor={anchor} fontFamily="monospace">
        {node.dir || 'root'} · {formatSize(node.size)}
      </text>
    </g>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// Static starfield — rendered once
function StarField({ width, height }: { width: number; height: number }) {
  const starsRef = useRef<Array<{ x: number; y: number; r: number; op: number }> | null>(null);
  if (!starsRef.current) {
    starsRef.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2 + 0.3,
      op: Math.random() * 0.4 + 0.05,
    }));
  }
  return (
    <g>
      {starsRef.current.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.op} />
      ))}
    </g>
  );
}
