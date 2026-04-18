import { useState } from 'react'

interface BisectStep {
  commitId: string
  commitMsg: string
  isMerge: boolean
  result: 'good' | 'bad' | 'skip' | 'pending'
  note?: string
}

// Simulates bisect on non-linear history
const nonLinearSteps: BisectStep[] = [
  { commitId: 'c4', commitMsg: 'feat: dark mode', isMerge: false, result: 'bad', note: '起点：已知 c4 有 bug' },
  { commitId: 'c1', commitMsg: 'init: project setup', isMerge: false, result: 'good', note: '终点：c1 是好的' },
  {
    commitId: 'm2',
    commitMsg: "Merge branch 'feature/profile'",
    isMerge: true,
    result: 'skip',
    note: '⚠️ bisect 停在 merge commit，无法测试，只能 skip',
  },
  {
    commitId: 'p2',
    commitMsg: 'wip: avatar upload',
    isMerge: false,
    result: 'good',
    note: '进入 feature 分支继续排查，bisect 内套 bisect',
  },
  { commitId: 'p3', commitMsg: 'fix: typo in prop name', isMerge: false, result: 'bad', note: '定位到：p3 引入了 bug' },
]

// Simulates bisect on linear history
const linearSteps: BisectStep[] = [
  { commitId: 'l6', commitMsg: 'feat: dark mode (#18)', isMerge: false, result: 'bad', note: '起点：已知 l6 有 bug' },
  { commitId: 'l1', commitMsg: 'init: project setup', isMerge: false, result: 'good', note: '终点：l1 是好的' },
  { commitId: 'l4', commitMsg: 'hotfix: prod crash', isMerge: false, result: 'good', note: 'l4 正常，bug 在 l4 之后' },
  { commitId: 'l5', commitMsg: 'feat: profile page (#15)', isMerge: false, result: 'bad', note: '🎯 直接定位到 PR #15！' },
]

const RESULT_STYLES = {
  good: 'bg-green-100 border-green-400 text-green-800',
  bad: 'bg-red-100 border-red-400 text-red-800',
  skip: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  pending: 'bg-gray-100 border-gray-300 text-gray-500',
}

const RESULT_LABELS = {
  good: '✓ good',
  bad: '✗ bad',
  skip: '⚠ skip',
  pending: '…',
}

export function BisectDemo() {
  const [mode, setMode] = useState<'linear' | 'nonlinear'>('nonlinear')
  const [step, setStep] = useState(0)

  const steps = mode === 'nonlinear' ? nonLinearSteps : linearSteps
  const visibleSteps = steps.slice(0, step + 1)
  const isFinished = step >= steps.length - 1

  const handleReset = () => setStep(0)
  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1)
  }

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        {(['nonlinear', 'linear'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setStep(0) }}
            className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              mode === m
                ? m === 'nonlinear'
                  ? 'bg-orange-50 border-orange-400 text-orange-700'
                  : 'bg-green-50 border-green-400 text-green-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {m === 'nonlinear' ? '非线性历史' : '线性历史'}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-2 min-h-48">
        {visibleSteps.map((s, i) => (
          <div
            key={s.commitId + i}
            className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${RESULT_STYLES[s.result]}`}
          >
            <div className="flex-shrink-0 font-mono text-xs font-bold mt-0.5 w-14 text-center">
              {RESULT_LABELS[s.result]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs truncate">{s.commitMsg}</div>
              {s.note && <div className="text-xs mt-0.5 opacity-80">{s.note}</div>}
            </div>
            {s.isMerge && (
              <span className="flex-shrink-0 text-xs bg-orange-300 text-orange-900 px-1.5 py-0.5 rounded font-medium">merge</span>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {isFinished && (
        <div
          className={`p-3 rounded-lg text-sm font-medium text-center ${
            mode === 'nonlinear' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {mode === 'nonlinear'
            ? `共 ${steps.length} 步，1 次 skip + 额外进入 feature 分支排查，效率低下`
            : `共 ${steps.length} 步，直接定位到 PR，可立即查看变更内容`}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          重置
        </button>
        <button
          onClick={handleNext}
          disabled={isFinished}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            isFinished
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isFinished ? '已完成' : `下一步 (${step + 1}/${steps.length})`}
        </button>
      </div>
    </div>
  )
}
