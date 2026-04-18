import { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import type { FileNode } from '../types';
import { getFileRadius } from '../utils/colors';

export type Positions = Map<string, { x: number; y: number }>;

// Stable directory positions arranged on a circle around the center
function buildDirPositions(dirs: string[], cx: number, cy: number): Map<string, { x: number; y: number }> {
  const unique = [...new Set(dirs)].filter(Boolean);
  const map = new Map<string, { x: number; y: number }>();
  const r = Math.min(cx, cy) * 0.45;
  unique.forEach((dir, i) => {
    const angle = (i / unique.length) * 2 * Math.PI - Math.PI / 2;
    map.set(dir, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  });
  return map;
}

export function useD3Force(
  nodes: FileNode[],
  width: number,
  height: number
): Positions {
  const simRef = useRef<d3.Simulation<FileNode, never> | null>(null);
  // Store positions in a ref for reading during render, and a state for triggering re-renders
  const positionsRef = useRef<Positions>(new Map());
  const [, setTick] = useState(0);
  const prevNodesRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const rafRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const cx = width / 2;
  const cy = height / 2;

  // Create simulation once — tick updates a ref (cheap), RAF flushes to React state
  useEffect(() => {
    const sim = d3.forceSimulation<FileNode>()
      .force('charge', d3.forceManyBody<FileNode>().strength(-50))
      .force('center', d3.forceCenter(cx, cy).strength(0.08))
      .force('collision', d3.forceCollide<FileNode>(d => getFileRadius(d.size) + 3))
      .alphaDecay(0.018)
      .on('tick', () => {
        // Update ref synchronously (no React overhead per tick)
        const map = new Map<string, { x: number; y: number }>();
        sim.nodes().forEach(n => { map.set(n.id, { x: n.x ?? cx, y: n.y ?? cy }); });
        positionsRef.current = map;
        prevNodesRef.current = map;
        dirtyRef.current = true;
      });

    simRef.current = sim;

    // RAF loop: flush dirty positions to React at display frame rate (~60fps)
    function flush() {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setTick(t => t + 1); // cheap counter, just triggers re-render
      }
      rafRef.current = requestAnimationFrame(flush);
    }
    rafRef.current = requestAnimationFrame(flush);

    return () => {
      sim.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update nodes whenever the set changes
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;

    // Build stable directory positions on a circle
    const dirs = nodes.map(n => n.dir);
    const dirPositions = buildDirPositions(dirs, cx, cy);

    // Preserve positions of existing nodes; spawn new ones near center
    const prev = prevNodesRef.current;
    const updated: FileNode[] = nodes.map(n => {
      const existing = prev.get(n.id);
      if (existing) return { ...n, x: existing.x, y: existing.y };
      const a = Math.random() * 2 * Math.PI;
      const r = 15 + Math.random() * 25;
      return { ...n, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    });

    // Cluster force: gently attract files toward their directory centroid
    sim.force('cluster', (alpha: number) => {
      updated.forEach(n => {
        const target = dirPositions.get(n.dir);
        if (!target || n.x == null || n.y == null) return;
        n.vx = (n.vx ?? 0) + (target.x - n.x) * 0.035 * alpha;
        n.vy = (n.vy ?? 0) + (target.y - n.y) * 0.035 * alpha;
      });
    });

    sim.nodes(updated);
    sim.alpha(0.4).restart();
  }, [nodes, cx, cy]);

  return positionsRef.current;
}
