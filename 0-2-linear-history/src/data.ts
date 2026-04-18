import type { GitHistory, StrategyInfo } from './types'

export const COMMIT_RADIUS = 18
export const LANE_GAP = 60

// Non-linear history: shows the "railway" mess
export const nonLinearHistory: GitHistory = {
  label: '非线性历史（有 Merge Commit）',
  description: 'git log --graph 看到的"铁轨图"，merge commit 占满屏幕',
  commits: [
    // Main lane (x=80)
    { id: 'c1', message: 'init: project setup', branch: 'main', x: 80, y: 40 },
    { id: 'c2', message: 'feat: add router', branch: 'main', x: 80, y: 110 },
    // Feature/search branch (x=160)
    { id: 'f1', message: 'feat: search UI', branch: 'feature', x: 160, y: 170 },
    { id: 'f2', message: 'fix: review comment', branch: 'feature', x: 160, y: 240 },
    // Merge search → main
    {
      id: 'm1',
      message: "Merge branch 'feature/search'",
      branch: 'merge',
      isMerge: true,
      parents: ['c2', 'f2'],
      x: 80,
      y: 310,
    },
    { id: 'c3', message: 'hotfix: prod crash', branch: 'main', x: 80, y: 380 },
    // Feature/profile branch (x=160)
    { id: 'p1', message: 'feat: profile page', branch: 'feature', x: 160, y: 380 },
    { id: 'p2', message: 'wip: avatar upload', branch: 'feature', x: 160, y: 450 },
    { id: 'p3', message: 'fix: typo in prop', branch: 'feature', x: 160, y: 520 },
    // Merge profile → main
    {
      id: 'm2',
      message: "Merge branch 'feature/profile'",
      branch: 'merge',
      isMerge: true,
      parents: ['c3', 'p3'],
      x: 80,
      y: 590,
    },
    { id: 'c4', message: 'feat: dark mode', branch: 'main', x: 80, y: 660 },
  ],
}

// Linear history: clean single lane
export const linearHistory: GitHistory = {
  label: '线性历史（Squash & Merge）',
  description: 'git log --oneline 输出，每行对应一个功能点或修复',
  commits: [
    { id: 'l1', message: 'init: project setup', branch: 'main', x: 80, y: 40 },
    { id: 'l2', message: 'feat: add router', branch: 'main', x: 80, y: 110 },
    { id: 'l3', message: 'feat: search UI (#12)', branch: 'main', x: 80, y: 180 },
    { id: 'l4', message: 'hotfix: prod crash', branch: 'main', x: 80, y: 250 },
    { id: 'l5', message: 'feat: profile page (#15)', branch: 'main', x: 80, y: 320 },
    { id: 'l6', message: 'feat: dark mode (#18)', branch: 'main', x: 80, y: 390 },
  ],
}

export const strategies: StrategyInfo[] = [
  {
    id: 'merge-commit',
    name: 'Merge Commit',
    shortName: 'Merge',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    description: 'Git 默认行为，在主干上产生一个 merge commit，记录两条分支的合并事件。',
    pros: ['完整保留分支拓扑', '合并时机有明确记录', '适合需要审计的场景'],
    cons: ['历史非线性，git log 难以阅读', 'git bisect 可能停在 merge commit 上', 'revert 需要指定 -m 参数'],
  },
  {
    id: 'rebase-merge',
    name: 'Rebase & Merge',
    shortName: 'Rebase',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    description: 'Feature 分支的每个 commit 在主干最新节点上重放，以 fast-forward 方式合入。',
    pros: ['历史完全线性', '保留完整提交粒度', 'git blame 追溯精确'],
    cons: ['WIP 提交会污染主干', '需要提前整理 feature 分支', 'commit hash 会改变'],
  },
  {
    id: 'squash-merge',
    name: 'Squash & Merge',
    shortName: 'Squash',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    description: 'Feature 分支所有 commit 压缩为一个 commit 合入主干，每个 commit 对应一个 PR。',
    pros: ['主干历史极为干净', 'bisect 定位直接对应 PR', '适合前端业务团队'],
    cons: ['feature 分支内部历史消失', '细节变更只能翻 PR 页面', '大 PR squash 后粒度可能过粗'],
  },
]
