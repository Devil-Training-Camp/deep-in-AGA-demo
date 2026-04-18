import { useState } from 'react'
import { GitGraph } from './components/GitGraph'
import { MergeSimulator } from './components/MergeSimulator'
import { BisectDemo } from './components/BisectDemo'
import { nonLinearHistory, linearHistory } from './data'
import type { MergeStrategy } from './types'

type Tab = 'compare' | 'strategy' | 'bisect'

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: 'compare', label: '历史对比', emoji: '📊' },
  { id: 'strategy', label: '合并策略', emoji: '🔀' },
  { id: 'bisect', label: 'Bisect 效果', emoji: '🔍' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('compare')
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('squash-merge')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Git 线性历史可视化</h1>
          <p className="text-gray-500 text-sm">
            对应文章：
            <a
              href="../../drafts/linear-history.md"
              className="text-indigo-600 hover:text-indigo-800 underline"
            >
              一条直线：为什么团队应该保持 Git 线性提交历史
            </a>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {activeTab === 'compare' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">线性 vs 非线性历史</h2>
                <p className="text-sm text-gray-500 mt-1">
                  同样的功能开发，左侧是默认 merge commit 产生的"铁轨图"，右侧是 squash merge 产生的干净历史。
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GitGraph history={nonLinearHistory} />
                <GitGraph history={linearHistory} highlighted />
              </div>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>关键差异：</strong>左侧有 11 个节点，其中 2 个是 merge commit（橙色），4 个是 WIP 提交（蓝色噪音）。
                  右侧只有 6 个节点，每个 commit 都对应一个有意义的功能点或修复，
                  <code className="bg-amber-100 px-1 rounded text-xs">git log --oneline</code> 直接可读。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'strategy' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">三种合并策略对比</h2>
                <p className="text-sm text-gray-500 mt-1">
                  选择不同策略，观察同一个 feature 分支（含 3 个 WIP 提交）合入 main 后的结果差异。
                </p>
              </div>
              <MergeSimulator strategy={mergeStrategy} onStrategyChange={setMergeStrategy} />
            </div>
          )}

          {activeTab === 'bisect' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">git bisect 效率对比</h2>
                <p className="text-sm text-gray-500 mt-1">
                  模拟用 bisect 定位一个生产 bug 的过程——在非线性历史里，bisect 会停在 merge commit 上，
                  需要额外步骤；线性历史里，每一步都能测试，直接定位到对应 PR。
                </p>
              </div>
              <BisectDemo />
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-gray-400 mt-6">
          演示数据仅用于说明概念，实际项目中 commit 数量和分支结构会更复杂
        </p>
      </div>
    </div>
  )
}
