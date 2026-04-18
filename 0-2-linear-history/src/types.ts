export interface Commit {
  id: string
  message: string
  branch: 'main' | 'feature' | 'merge'
  isMerge?: boolean
  parents?: string[]
  x: number
  y: number
}

export interface GitHistory {
  commits: Commit[]
  label: string
  description: string
}

export type MergeStrategy = 'merge-commit' | 'rebase-merge' | 'squash-merge'

export interface StrategyInfo {
  id: MergeStrategy
  name: string
  shortName: string
  color: string
  bgColor: string
  borderColor: string
  description: string
  pros: string[]
  cons: string[]
}
