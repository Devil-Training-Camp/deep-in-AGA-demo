import type { SimulationNodeDatum } from 'd3';

export interface CommitInfo {
  sha: string;
  date: string;           // ISO string
  author: string;         // login or name
  authorAvatar?: string;
  message: string;        // first line only
}

// Extends D3 SimulationNodeDatum so it can be used directly in forceSimulation
export interface FileNode extends SimulationNodeDatum {
  id: string;             // full path (unique)
  name: string;           // filename
  ext: string;            // extension without dot, e.g. "ts"
  dir: string;            // top-level dir, e.g. "src"
  size: number;           // bytes
  addedAtCommit: number;  // index into commits array
  deletedAtCommit?: number;
}

export interface Snapshot {
  commitIndex: number;
  sha: string;
  files: Array<{ path: string; size: number }>;
}

export interface RepoData {
  commits: CommitInfo[];
  snapshots: Snapshot[];  // sparse keyframes, evenly spaced
}

export type LoadStatus =
  | { type: 'idle' }
  | { type: 'loading'; message: string; progress: number }
  | { type: 'ready'; data: RepoData }
  | { type: 'error'; message: string };
