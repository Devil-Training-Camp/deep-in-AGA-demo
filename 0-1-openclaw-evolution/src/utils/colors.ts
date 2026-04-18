const EXT_COLORS: Record<string, string> = {
  ts: '#3b82f6',
  tsx: '#60a5fa',
  js: '#f59e0b',
  jsx: '#fbbf24',
  py: '#10b981',
  go: '#06b6d4',
  rs: '#f97316',
  md: '#a78bfa',
  mdx: '#c084fc',
  json: '#34d399',
  yaml: '#34d399',
  yml: '#34d399',
  toml: '#2dd4bf',
  css: '#ec4899',
  scss: '#db2777',
  html: '#fb923c',
  sh: '#94a3b8',
  bash: '#94a3b8',
  lock: '#475569',
  svg: '#f472b6',
  png: '#64748b',
  jpg: '#64748b',
  env: '#fde68a',
};

export function getFileColor(ext: string): string {
  return EXT_COLORS[ext.toLowerCase()] ?? '#64748b';
}

export function getFileRadius(size: number): number {
  return Math.max(3, Math.min(14, 2.5 + Math.sqrt(size / 400)));
}

// 12 distinct colors for contributors
export const CONTRIBUTOR_COLORS = [
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16',
  '#a78bfa', '#fb923c',
];
