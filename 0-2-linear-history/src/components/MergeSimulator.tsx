import { useState } from 'react'
import type { MergeStrategy } from '../types'
import { strategies } from '../data'

interface FeatureCommit {
  id: string
  message: string
  isWip: boolean
}

const featureCommits: FeatureCommit[] = [
  { id: 'f1', message: 'feat: user profile page', isWip: false },
  { id: 'f2', message: 'wip: half-done avatar upload', isWip: true },
  { id: 'f3', message: 'fix: review comment - useCallback', isWip: true },
  { id: 'f4', message: 'fix: typo in prop name', isWip: true },
]

const mainCommitsBefore = [
  { id: 'c1', message: 'feat: add router (#10)' },
  { id: 'c2', message: 'hotfix: prod crash (#11)' },
]

function getResultCommits(strategy: MergeStrategy) {
  switch (strategy) {
    case 'merge-commit':
      return [
        ...mainCommitsBefore,
        ...featureCommits.map((c) => ({ id: c.id, message: c.message, isFeature: true, isWip: c.isWip })),
        { id: 'merge', message: "Merge branch 'feature/profile'", isMerge: true },
      ]
    case 'rebase-merge':
      return [
        ...mainCommitsBefore,
        ...featureCommits.map((c) => ({
          id: c.id + "'",
          message: c.message + " (rebased)",
          isFeature: true,
          isWip: c.isWip,
        })),
      ]
    case 'squash-merge':
      return [
        ...mainCommitsBefore,
        { id: 'sq', message: 'feat: user profile page (#15)', isSquash: true },
      ]
  }
}

interface Props {
  strategy: MergeStrategy
  onStrategyChange: (s: MergeStrategy) => void
}

export function MergeSimulator({ strategy, onStrategyChange }: Props) {
  const [showFeatureBranch, setShowFeatureBranch] = useState(true)
  const resultCommits = getResultCommits(strategy)
  const currentStrategy = strategies.find((s) => s.id === strategy)!

  return (
    <div className="space-y-4">
      {/* Strategy selector */}
      <div className="grid grid-cols-3 gap-2">
        {strategies.map((s) => (
          <button
            key={s.id}
            onClick={() => onStrategyChange(s.id)}
            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              strategy === s.id
                ? `${s.bgColor} ${s.borderColor} ${s.color}`
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {s.shortName}
          </button>
        ))}
      </div>

      {/* Strategy description */}
      <div className={`rounded-lg p-3 ${currentStrategy.bgColor} border ${currentStrategy.borderColor}`}>
        <p className={`text-sm ${currentStrategy.color}`}>{currentStrategy.description}</p>
      </div>

      {/* Visual: Before → After */}
      <div className="grid grid-cols-2 gap-4">
        {/* Before: feature branch */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">合并前</span>
            <button
              onClick={() => setShowFeatureBranch(!showFeatureBranch)}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              {showFeatureBranch ? '收起分支' : '展开分支'}
            </button>
          </div>
          <div className="space-y-1">
            {mainCommitsBefore.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 bg-green-50 rounded border border-green-200">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-mono truncate">{c.message}</span>
              </div>
            ))}
            {showFeatureBranch && (
              <>
                <div className="ml-4 border-l-2 border-dashed border-blue-300 pl-2 space-y-1 py-1">
                  {featureCommits.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded border ${
                        c.isWip
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.isWip ? 'bg-yellow-400' : 'bg-blue-500'}`} />
                      <span className="text-xs font-mono truncate text-gray-700">{c.message}</span>
                      {c.isWip && (
                        <span className="text-xs bg-yellow-200 text-yellow-700 px-1 rounded flex-shrink-0">WIP</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="ml-2 text-xs text-blue-600 font-medium">↑ feature/profile 分支</div>
              </>
            )}
          </div>
        </div>

        {/* After: main branch result */}
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">合并后 main</span>
          <div className="space-y-1">
            {resultCommits.map((c: Record<string, unknown>, i) => {
              const isMerge = Boolean(c.isMerge)
              const isSquash = Boolean(c.isSquash)
              const isFeature = Boolean(c.isFeature)
              const isWip = Boolean(c.isWip)
              return (
                <div
                  key={String(c.id) + i}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-all ${
                    isMerge
                      ? 'bg-orange-50 border-orange-300'
                      : isSquash
                      ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300'
                      : isFeature && isWip
                      ? 'bg-yellow-50 border-yellow-300'
                      : isFeature
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isMerge ? 'bg-orange-500' : isSquash ? 'bg-blue-600' : isFeature && isWip ? 'bg-yellow-400' : isFeature ? 'bg-blue-400' : 'bg-green-500'
                    }`}
                  />
                  <span
                    className={`text-xs font-mono truncate ${
                      isMerge ? 'text-orange-700 italic font-medium' : isSquash ? 'text-blue-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {String(c.message)}
                  </span>
                  {isMerge && <span className="text-xs bg-orange-200 text-orange-700 px-1 rounded flex-shrink-0">merge</span>}
                  {isSquash && <span className="text-xs bg-blue-200 text-blue-700 px-1 rounded flex-shrink-0">squash</span>}
                  {isFeature && isWip && <span className="text-xs bg-yellow-200 text-yellow-700 px-1 rounded flex-shrink-0">WIP</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pros & Cons */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
        <div>
          <p className="text-xs font-semibold text-green-700 mb-1.5">优点</p>
          <ul className="space-y-1">
            {currentStrategy.pros.map((p, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-700 mb-1.5">缺点</p>
          <ul className="space-y-1">
            {currentStrategy.cons.map((c, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
