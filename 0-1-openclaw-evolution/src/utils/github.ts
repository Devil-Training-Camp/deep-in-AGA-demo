import type { CommitInfo, Snapshot } from '../types';

const REPO = 'vercel/ai';
const BASE = 'https://api.github.com';

function makeHeaders(): HeadersInit {
  const token = (import.meta as Record<string, unknown> & { env?: Record<string, string> }).env
    ?.VITE_GITHUB_TOKEN;
  return token
    ? { Authorization: `token ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    : { 'X-GitHub-Api-Version': '2022-11-28' };
}

interface RawCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  author: { login: string; avatar_url: string } | null;
}

interface RawTreeItem {
  path?: string;
  type: string;
  size?: number;
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function fetchAllCommits(
  onProgress: (loaded: number) => void
): Promise<CommitInfo[]> {
  const all: RawCommit[] = [];
  // Fetch up to 4 pages (400 commits max) to stay within rate limits
  for (let page = 1; page <= 4; page++) {
    const r = await fetch(`${BASE}/repos/${REPO}/commits?per_page=100&page=${page}`, {
      headers: makeHeaders(),
    });
    if (!r.ok) throw new Error(`GitHub API ${r.status}: ${r.statusText}`);
    const batch: RawCommit[] = await r.json();
    if (!batch.length) break;
    all.push(...batch);
    onProgress(all.length);
    if (batch.length < 100) break;
    await sleep(300);
  }
  // Oldest first
  return all.reverse().map(c => ({
    sha: c.sha,
    date: c.commit.author.date,
    author: c.author?.login ?? c.commit.author.name,
    authorAvatar: c.author?.avatar_url,
    message: c.commit.message.split('\n')[0].slice(0, 80),
  }));
}

// Extensions worth visualizing — skip lock files, binaries, generated assets
const CODE_EXTS = new Set([
  'ts','tsx','js','jsx','mjs','mts','cjs',
  'swift','kt','go','py','rs','rb','java','cpp','c','h',
  'md','mdx','txt','html','css','scss',
  'json','yaml','yml','toml','sh','bash','env',
]);

// Top-level dirs to skip entirely (vendor, generated, CI internals, docs)
const SKIP_DIRS = new Set([
  'node_modules','dist','build','.git','vendor','__pycache__',
  '.github','.agents','.pi','.codex',
  'content','contributing','architecture','.changeset','.vscode',
  'assets','playground','docs',
]);

/** Max files we'll include per snapshot to keep the force sim snappy */
const MAX_NODES = 200;

export async function fetchTreeAtSha(sha: string): Promise<Array<{ path: string; size: number }>> {
  const r = await fetch(`${BASE}/repos/${REPO}/git/trees/${sha}?recursive=1`, {
    headers: makeHeaders(),
  });
  if (!r.ok) throw new Error(`GitHub API ${r.status}: ${r.statusText}`);
  const data = await r.json();

  const blobs = ((data.tree ?? []) as RawTreeItem[]).filter(f => f.type === 'blob' && f.path);

  // Filter step 1: skip unwanted dirs and non-code extensions
  const filtered = blobs.filter(f => {
    const topDir = f.path!.split('/')[0];
    if (SKIP_DIRS.has(topDir)) return false;
    const name = f.path!.split('/').pop()!;
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
    return CODE_EXTS.has(ext);
  });

  // Filter step 2: if still over cap, keep the largest files
  // (big files = more important / more interesting to watch grow)
  const sorted = filtered.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  const capped = sorted.slice(0, MAX_NODES);

  return capped.map(f => ({ path: f.path!, size: f.size ?? 0 }));
}

/** Fetch N evenly-spaced tree snapshots from the commit list */
export async function fetchSnapshots(
  commits: CommitInfo[],
  numSnapshots: number,
  onProgress: (i: number, total: number) => void
): Promise<Snapshot[]> {
  const indices = selectKeyframeIndices(commits.length, numSnapshots);
  const snapshots: Snapshot[] = [];

  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    onProgress(i + 1, indices.length);
    const files = await fetchTreeAtSha(commits[idx].sha);
    snapshots.push({ commitIndex: idx, sha: commits[idx].sha, files });
    await sleep(400); // courtesy delay between requests
  }
  return snapshots;
}

function selectKeyframeIndices(total: number, n: number): number[] {
  if (total <= n) return Array.from({ length: total }, (_, i) => i);
  const step = (total - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(i * step));
}
