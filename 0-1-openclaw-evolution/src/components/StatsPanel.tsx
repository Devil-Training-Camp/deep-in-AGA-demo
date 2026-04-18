import { useMemo } from 'react';
import type { CommitInfo, FileNode } from '../types';
import { getFileColor, CONTRIBUTOR_COLORS } from '../utils/colors';

interface Props {
  commits: CommitInfo[];
  currentIndex: number;
  nodes: FileNode[];
}

export function StatsPanel({ commits, currentIndex, nodes }: Props) {
  const contributors = useMemo(() => {
    const map = new Map<string, { count: number; avatar?: string }>();
    for (let i = 0; i <= currentIndex; i++) {
      const c = commits[i];
      const existing = map.get(c.author) ?? { count: 0, avatar: c.authorAvatar };
      map.set(c.author, { count: existing.count + 1, avatar: c.authorAvatar });
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  }, [commits, currentIndex]);

  const langBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach(n => {
      const ext = n.ext || 'other';
      counts.set(ext, (counts.get(ext) ?? 0) + Math.max(n.size, 100));
    });
    const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([ext, size]) => ({ ext, pct: size / total }));
  }, [nodes]);

  const totalLines = useMemo(
    () => nodes.reduce((s, n) => s + Math.round(n.size / 35), 0),
    [nodes]
  );

  return (
    <div
      className="absolute top-4 right-4 flex flex-col gap-4 text-xs font-mono"
      style={{ width: 180 }}
    >
      {/* Counters */}
      <div
        className="rounded-xl p-3 flex flex-col gap-2"
        style={{ background: 'rgba(13,17,23,0.85)', border: '1px solid #1e293b' }}
      >
        <StatRow label="Files" value={nodes.length.toLocaleString()} color="#3b82f6" />
        <StatRow label="Commits" value={(currentIndex + 1).toLocaleString()} color="#a78bfa" />
        <StatRow label="~Lines" value={totalLines.toLocaleString()} color="#34d399" />
      </div>

      {/* Contributors */}
      <div
        className="rounded-xl p-3"
        style={{ background: 'rgba(13,17,23,0.85)', border: '1px solid #1e293b' }}
      >
        <div className="text-slate-500 mb-2 uppercase tracking-wider text-[10px]">Contributors</div>
        <div className="flex flex-col gap-1.5">
          {contributors.map(([login, info], idx) => (
            <div key={login} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: CONTRIBUTOR_COLORS[idx % CONTRIBUTOR_COLORS.length] }}
              />
              <span className="text-slate-300 truncate flex-1" style={{ fontSize: 10 }}>
                {login}
              </span>
              <span className="text-slate-600" style={{ fontSize: 10 }}>
                {info.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Language breakdown */}
      {langBreakdown.length > 0 && (
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(13,17,23,0.85)', border: '1px solid #1e293b' }}
        >
          <div className="text-slate-500 mb-2 uppercase tracking-wider text-[10px]">Languages</div>
          {/* Bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden mb-2">
            {langBreakdown.map(({ ext, pct }) => (
              <div
                key={ext}
                style={{ width: `${pct * 100}%`, background: getFileColor(ext) }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {langBreakdown.map(({ ext, pct }) => (
              <div key={ext} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: getFileColor(ext) }} />
                <span className="text-slate-400 flex-1" style={{ fontSize: 10 }}>
                  .{ext}
                </span>
                <span className="text-slate-600" style={{ fontSize: 10 }}>
                  {Math.round(pct * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
