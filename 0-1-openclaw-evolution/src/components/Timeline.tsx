import { useMemo } from 'react';
import type { CommitInfo } from '../types';

interface Props {
  commits: CommitInfo[];
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  onChange: (index: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (s: number) => void;
}

export function Timeline({
  commits,
  currentIndex,
  isPlaying,
  speed,
  onChange,
  onTogglePlay,
  onSpeedChange,
}: Props) {
  const current = commits[currentIndex];

  // Commit density: group commits by week for the histogram
  const density = useMemo(() => {
    if (!commits.length) return [];
    const BUCKETS = 60;
    const buckets = new Array(BUCKETS).fill(0) as number[];
    commits.forEach((_, i) => {
      buckets[Math.floor((i / commits.length) * BUCKETS)]++;
    });
    const max = Math.max(...buckets, 1);
    return buckets.map(v => v / max);
  }, [commits]);

  const progress = commits.length ? currentIndex / (commits.length - 1) : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 pt-2"
      style={{ background: 'linear-gradient(to top, #050a10ee, transparent)' }}>

      {/* Density histogram */}
      <div className="flex items-end gap-px mb-1 h-6 opacity-40">
        {density.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(2, v * 24)}px`,
              background: i / density.length <= progress ? '#3b82f6' : '#334155',
            }}
          />
        ))}
      </div>

      {/* Scrubber track */}
      <div className="relative h-1 rounded-full mb-3 cursor-pointer group"
        style={{ background: '#1e293b' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          onChange(Math.round(ratio * (commits.length - 1)));
        }}>
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${progress * 100}%`, background: '#3b82f6' }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-blue-400 bg-blue-500 shadow-lg"
          style={{ left: `calc(${progress * 100}% - 6px)` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-4">
        {/* Play/pause */}
        <button
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          style={{ background: '#1e293b' }}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5l9 5.5-9 5.5z" />
            </svg>
          )}
        </button>

        {/* Speed selector */}
        <div className="flex gap-1">
          {[1, 2, 5].map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className="px-2 py-0.5 rounded text-xs font-mono transition-colors"
              style={{
                background: speed === s ? '#3b82f6' : '#1e293b',
                color: speed === s ? 'white' : '#64748b',
              }}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Date display */}
        {current && (
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <span className="text-xs font-mono text-blue-400 shrink-0">
              {formatDate(current.date)}
            </span>
            <span className="text-xs text-slate-500 truncate">
              #{currentIndex + 1}/{commits.length}
            </span>
          </div>
        )}

        {/* Repo tag */}
        <div className="text-xs font-mono text-slate-600">vercel/ai</div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
