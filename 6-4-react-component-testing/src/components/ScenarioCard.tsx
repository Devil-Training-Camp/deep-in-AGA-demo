import { useState } from 'react'
import { TestScenario, CATEGORY_COLOR } from '../data'

interface ScenarioCardProps {
  scenario: TestScenario
  isHighlighted: boolean
}

export function ScenarioCard({ scenario, isHighlighted }: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false)
  const catColor = CATEGORY_COLOR[scenario.category] ?? 'text-gray-400'

  return (
    <div
      className={`rounded-lg border transition-all duration-200 overflow-hidden ${
        isHighlighted
          ? 'border-blue-500 bg-blue-950/30 shadow-lg shadow-blue-900/20'
          : 'border-gray-800 bg-gray-900/50'
      }`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-3 flex items-start gap-2"
      >
        <span className={`text-xs font-semibold shrink-0 mt-0.5 ${catColor}`}>
          [{scenario.category}]
        </span>
        <span className="text-sm text-gray-200 leading-snug">{scenario.title}</span>
        <span className="ml-auto shrink-0 text-gray-500 text-xs mt-0.5">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 bg-gray-950 p-3">
          <pre className="text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">
            {scenario.code}
          </pre>
        </div>
      )}
    </div>
  )
}
