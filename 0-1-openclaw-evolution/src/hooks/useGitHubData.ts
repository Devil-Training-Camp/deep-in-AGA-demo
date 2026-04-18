import { useState, useEffect } from 'react';
import type { RepoData, LoadStatus, FileNode } from '../types';
import { fetchAllCommits, fetchSnapshots } from '../utils/github';
import { DEMO_DATA } from '../data/demoData';

const CACHE_KEY = 'vercel-ai-v1';
const NUM_SNAPSHOTS = 12;

export function useGitHubData() {
  const [status, setStatus] = useState<LoadStatus>({ type: 'idle' });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    // 1. Try sessionStorage cache (avoids re-fetching on page refresh)
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setStatus({ type: 'ready', data: JSON.parse(cached) as RepoData });
        return;
      }
    } catch {
      // corrupt cache — continue to fetch
    }

    // 2. Try live GitHub API
    try {
      setStatus({ type: 'loading', message: '正在获取 commit 历史…', progress: 5 });
      const commits = await fetchAllCommits(loaded => {
        setStatus({ type: 'loading', message: `已加载 ${loaded} 个 commits…`, progress: 10 });
      });

      setStatus({
        type: 'loading',
        message: `共 ${commits.length} 个 commits，正在采样文件树…`,
        progress: 20,
      });
      const snapshots = await fetchSnapshots(commits, NUM_SNAPSHOTS, (i, total) => {
        setStatus({
          type: 'loading',
          message: `采样文件树 ${i}/${total}…`,
          progress: 20 + Math.round((i / total) * 75),
        });
      });

      const data: RepoData = { commits, snapshots };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* quota */ }
      setStatus({ type: 'ready', data });
    } catch {
      // 3. GitHub API failed (rate limit / offline) — fall back to demo data instantly
      setStatus({ type: 'ready', data: DEMO_DATA });
    }
  }

  return status;
}

/**
 * Derive the set of FileNodes that are "alive" at a given commit index,
 * based on sparse snapshots. A file is alive if it appeared in a snapshot
 * at or before currentCommit and has not disappeared in a later snapshot.
 */
export function deriveFileNodes(data: RepoData, currentCommit: number): FileNode[] {
  const { snapshots } = data;

  // Find the latest snapshot at or before currentCommit
  const snapshotBefore = [...snapshots]
    .reverse()
    .find(s => s.commitIndex <= currentCommit);

  if (!snapshotBefore) return [];

  // Find the snapshot just after (to detect deletions between keyframes)
  const snapshotAfter = snapshots.find(s => s.commitIndex > currentCommit);

  const afterPaths = snapshotAfter ? new Set(snapshotAfter.files.map(f => f.path)) : null;
  const beforeFiles = snapshotBefore.files;

  // Find when each file was first added (earliest snapshot containing it)
  const firstSeenAt = new Map<string, number>();
  for (const snap of snapshots) {
    if (snap.commitIndex > currentCommit) break;
    for (const f of snap.files) {
      if (!firstSeenAt.has(f.path)) firstSeenAt.set(f.path, snap.commitIndex);
    }
  }

  // Monorepo containers: when a file lives under these, cluster by sub-directory
  const MONOREPO_CONTAINERS = new Set(['packages', 'apps', 'examples', 'skills', 'tools']);

  return beforeFiles
    .filter(f => {
      // Exclude if it disappears before currentCommit
      if (afterPaths && !afterPaths.has(f.path)) {
        // It's gone in the next snapshot — but that snapshot might be beyond currentCommit
        // so we include it (it's still alive between currentCommit and snapshotAfter)
      }
      return true;
    })
    .map(f => {
      const parts = f.path.split('/');
      const name = parts[parts.length - 1];
      const ext = name.includes('.') ? name.split('.').pop()! : '';
      // For monorepos, cluster by "container/subdir" (e.g. "packages/ai", "examples/next")
      const dir = (() => {
        if (parts.length <= 1) return '';
        if (MONOREPO_CONTAINERS.has(parts[0]) && parts.length > 2) {
          return `${parts[0]}/${parts[1]}`;
        }
        return parts[0];
      })();
      return {
        id: f.path,
        name,
        ext,
        dir,
        size: f.size,
        addedAtCommit: firstSeenAt.get(f.path) ?? snapshotBefore.commitIndex,
      };
    });
}
