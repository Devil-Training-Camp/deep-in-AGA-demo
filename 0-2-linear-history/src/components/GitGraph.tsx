import type { GitHistory } from '../types'
import { COMMIT_RADIUS } from '../data'

interface Props {
  history: GitHistory
  highlighted?: boolean
}

const BRANCH_COLORS = {
  main: { fill: '#4ade80', stroke: '#16a34a', text: '#15803d' },
  feature: { fill: '#60a5fa', stroke: '#2563eb', text: '#1d4ed8' },
  merge: { fill: '#f97316', stroke: '#ea580c', text: '#c2410c' },
}

export function GitGraph({ history, highlighted }: Props) {
  const { commits } = history
  const svgHeight = Math.max(...commits.map((c) => c.y)) + 60
  const svgWidth = 320

  const getCommitById = (id: string) => commits.find((c) => c.id === id)

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all ${
        highlighted ? 'border-indigo-400 shadow-lg shadow-indigo-100' : 'border-gray-200'
      }`}
    >
      <div className="mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">{history.label}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{history.description}</p>
      </div>
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="block mx-auto">
          {/* Draw edges first */}
          {commits.map((commit) => {
            const edges = []

            // Straight line to previous commit in same branch
            const idx = commits.indexOf(commit)
            if (idx > 0) {
              const prev = commits[idx - 1]
              if (prev.branch === commit.branch && !commit.isMerge) {
                edges.push(
                  <line
                    key={`edge-${prev.id}-${commit.id}`}
                    x1={prev.x}
                    y1={prev.y}
                    x2={commit.x}
                    y2={commit.y}
                    stroke={BRANCH_COLORS[prev.branch].stroke}
                    strokeWidth="2"
                    opacity="0.5"
                  />
                )
              }
            }

            // Merge commit edges
            if (commit.isMerge && commit.parents) {
              commit.parents.forEach((parentId) => {
                const parent = getCommitById(parentId)
                if (parent) {
                  edges.push(
                    <line
                      key={`merge-${parentId}-${commit.id}`}
                      x1={parent.x}
                      y1={parent.y}
                      x2={commit.x}
                      y2={commit.y}
                      stroke="#f97316"
                      strokeWidth="2"
                      strokeDasharray="5,3"
                      opacity="0.7"
                    />
                  )
                }
              })
            }

            return edges
          })}

          {/* Draw main lane vertical line */}
          {(() => {
            const mainCommits = commits.filter((c) => c.branch === 'main' || c.branch === 'merge')
            if (mainCommits.length < 2) return null
            return (
              <line
                x1={80}
                y1={mainCommits[0].y}
                x2={80}
                y2={mainCommits[mainCommits.length - 1].y}
                stroke="#16a34a"
                strokeWidth="2"
                opacity="0.3"
              />
            )
          })()}

          {/* Draw nodes */}
          {commits.map((commit) => {
            const colors = BRANCH_COLORS[commit.branch]
            const shortId = commit.id.slice(0, 6)

            return (
              <g key={commit.id} className="commit-node cursor-default">
                <circle
                  cx={commit.x}
                  cy={commit.y}
                  r={COMMIT_RADIUS}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="2"
                />
                {commit.isMerge && (
                  <text
                    x={commit.x}
                    y={commit.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="14"
                    fontWeight="bold"
                    fill="white"
                  >
                    ⊕
                  </text>
                )}
                {!commit.isMerge && (
                  <text
                    x={commit.x}
                    y={commit.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="9"
                    fontFamily="monospace"
                    fill="white"
                    fontWeight="600"
                  >
                    {shortId}
                  </text>
                )}
                {/* Commit message label */}
                <text
                  x={commit.x + COMMIT_RADIUS + 8}
                  y={commit.y + 1}
                  dominantBaseline="middle"
                  fontSize="11"
                  fill={commit.isMerge ? '#c2410c' : '#374151'}
                  fontWeight={commit.isMerge ? '600' : '400'}
                  fontStyle={commit.isMerge ? 'italic' : 'normal'}
                >
                  {commit.message.length > 26 ? commit.message.slice(0, 26) + '…' : commit.message}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
        {[
          { branch: 'main' as const, label: 'main 分支' },
          { branch: 'feature' as const, label: 'feature 分支' },
          { branch: 'merge' as const, label: 'merge commit' },
        ].map(({ branch, label }) => (
          <div key={branch} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: BRANCH_COLORS[branch].fill, border: `1.5px solid ${BRANCH_COLORS[branch].stroke}` }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
