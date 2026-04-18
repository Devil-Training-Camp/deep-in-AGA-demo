import { useState } from 'react'
import { PROPS, SCENARIOS, KIND_META, PropDef } from './data'
import { PropCard } from './components/PropCard'
import { ScenarioCard } from './components/ScenarioCard'
import { RulePanel } from './components/RulePanel'

function usePropsExplorer() {
  const [selectedProp, setSelectedProp] = useState<PropDef | null>(null)

  const handleSelect = (prop: PropDef) => {
    setSelectedProp((prev) => (prev?.name === prop.name ? null : prop))
  }

  const highlightedScenarios = selectedProp
    ? SCENARIOS.filter((s) => s.propNames.includes(selectedProp.name))
    : []

  const highlightedPropNames = selectedProp
    ? SCENARIOS.filter((s) => s.propNames.includes(selectedProp.name))
        .flatMap((s) => s.propNames)
    : []

  return { selectedProp, handleSelect, highlightedScenarios, highlightedPropNames }
}

export default function App() {
  const { selectedProp, handleSelect, highlightedScenarios, highlightedPropNames } =
    usePropsExplorer()

  const matchCount = highlightedScenarios.length

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className="text-xl font-bold text-white">
          AI 从 Props 推导测试场景
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          点击左侧任意 Prop，查看 AI 如何从类型定义推导出对应的测试场景
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Left: Props Panel */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                Props 定义
              </span>
              <span className="text-xs text-gray-600 font-mono">SearchFormProps</span>
            </div>
            <div className="space-y-2">
              {PROPS.map((prop) => (
                <PropCard
                  key={prop.name}
                  prop={prop}
                  isSelected={selectedProp?.name === prop.name}
                  isHighlighted={highlightedPropNames.includes(prop.name)}
                  onClick={() => handleSelect(prop)}
                />
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <RulePanel activeKind={selectedProp?.kind ?? null} />
          </div>
        </div>

        {/* Right: Scenarios Panel */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              推导出的测试场景
            </span>
            {selectedProp ? (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    KIND_META[selectedProp.kind].color
                  } bg-black/30`}
                >
                  {selectedProp.name}
                </span>
                <span className="text-xs text-gray-400">
                  匹配 {matchCount} 个场景
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-600">全部 {SCENARIOS.length} 个场景</span>
            )}
          </div>

          {/* Category legend */}
          <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-800">
            {[['渲染测试','text-sky-400'],['交互测试','text-violet-400'],['边界场景','text-amber-400'],['状态分支','text-emerald-400']].map(
              ([label, color]) => (
                <span key={label} className={`text-xs font-semibold ${color}`}>
                  ● {label}
                </span>
              )
            )}
          </div>

          <div className="space-y-2">
            {SCENARIOS.map((scenario) => {
              const isHighlighted = selectedProp
                ? scenario.propNames.includes(selectedProp.name)
                : false
              return (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isHighlighted={isHighlighted}
                />
              )
            })}
          </div>

          {selectedProp && matchCount === 0 && (
            <div className="text-center py-8 text-gray-600 text-sm">
              该 Prop 暂无对应示例场景
            </div>
          )}
        </div>
      </div>

      {/* Footer tip */}
      <div className="max-w-6xl mx-auto mt-4 text-xs text-gray-700 text-center">
        点击场景卡片可展开查看生成的测试代码 · 对应文章：第 6.4 节 React 组件测试
      </div>
    </div>
  )
}
