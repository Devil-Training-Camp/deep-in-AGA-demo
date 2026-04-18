import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useGitHubData, deriveFileNodes } from './hooks/useGitHubData';
import { CodeUniverse } from './components/CodeUniverse';
import { Timeline } from './components/Timeline';
import { StatsPanel } from './components/StatsPanel';
import type { FileNode } from './types';

const TICK_INTERVAL_MS = 120; // ms per commit step at 1× speed

export function App() {
  const status = useGitHubData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Track resize
  useEffect(() => {
    const handler = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const maxIndex = status.type === 'ready' ? status.data.commits.length - 1 : 0;

  // Auto-play tick
  useEffect(() => {
    if (!isPlaying || status.type !== 'ready') return;
    const id = setInterval(() => {
      setCurrentIndex(i => {
        if (i >= maxIndex) { setIsPlaying(false); return i; }
        return Math.min(i + speed, maxIndex);
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying, speed, maxIndex, status.type]);

  // Start playing automatically once data is ready
  useEffect(() => {
    if (status.type === 'ready') {
      setCurrentIndex(0);
      setTimeout(() => setIsPlaying(true), 800);
    }
  }, [status.type]);

  // Derive file nodes for the current commit index
  const nodes: FileNode[] = useMemo(() => {
    if (status.type !== 'ready') return [];
    return deriveFileNodes(status.data, currentIndex);
  }, [status, currentIndex]);

  // Track which node IDs are newly appeared (for glow effect)
  const prevNodeIds = useRef<Set<string>>(new Set());
  const newNodeIds = useMemo(() => {
    const current = new Set(nodes.map(n => n.id));
    const newIds = new Set([...current].filter(id => !prevNodeIds.current.has(id)));
    prevNodeIds.current = current;
    return newIds;
  }, [nodes]);

  const handleTogglePlay = useCallback(() => {
    if (currentIndex >= maxIndex) {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(p => !p);
    }
  }, [currentIndex, maxIndex]);

  if (status.type === 'idle' || status.type === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-6">
        <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
          vercel/ai
        </div>
        <div className="text-slate-400 text-sm">
          {status.type === 'loading' ? status.message : '初始化中…'}
        </div>
        {status.type === 'loading' && (
          <div className="w-64 h-1 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%`, background: '#3b82f6' }}
            />
          </div>
        )}
        <div className="text-xs text-slate-600 text-center max-w-xs leading-relaxed">
          首次加载从 GitHub API 获取数据，约需 30–60 秒。<br />
          之后数据会缓存在本地，秒开。
          <br />
          <br />
          如遇速率限制，可在 .env 中配置{' '}
          <span className="text-slate-400">VITE_GITHUB_TOKEN</span>
        </div>
      </div>
    );
  }

  if (status.type === 'error') {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4">
        <div className="text-red-400 text-sm font-bold">加载失败</div>
        <div className="text-slate-500 text-xs max-w-sm text-center">{status.message}</div>
        <button
          onClick={() => sessionStorage.removeItem('vercel-ai-v1')}
          className="text-xs text-blue-400 hover:underline"
        >
          清除缓存并重试
        </button>
      </div>
    );
  }

  const { data } = status;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Main universe canvas */}
      <CodeUniverse
        nodes={nodes}
        newNodeIds={newNodeIds}
        width={size.w}
        height={size.h}
      />

      {/* Commit info bar — top */}
      <CommitBar commit={data.commits[currentIndex]} />

      {/* Stats panel — top right */}
      <StatsPanel
        commits={data.commits}
        currentIndex={currentIndex}
        nodes={nodes}
      />

      {/* Timeline — bottom */}
      <Timeline
        commits={data.commits}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        speed={speed}
        onChange={setCurrentIndex}
        onTogglePlay={handleTogglePlay}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}

function CommitBar({ commit }: { commit?: { author: string; message: string; date: string } }) {
  if (!commit) return null;
  return (
    <div
      className="absolute top-0 left-0 right-0 px-4 py-2 flex items-center gap-3 text-xs"
      style={{ background: 'linear-gradient(to bottom, #050a10ee, transparent)' }}
    >
      <span className="font-bold" style={{ color: '#3b82f6' }}>vercel/ai</span>
      <span className="text-slate-500">·</span>
      <span className="text-slate-300 truncate max-w-md">{commit.message}</span>
      <span className="text-slate-500">·</span>
      <span className="text-slate-500 shrink-0">{commit.author}</span>
    </div>
  );
}
