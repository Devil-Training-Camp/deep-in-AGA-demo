import { PropKind, KIND_META } from '../data'

interface RulePanelProps {
  activeKind: PropKind | null
}

const ALL_KINDS: PropKind[] = ['callback', 'boolean', 'required', 'optional', 'union']

export function RulePanel({ activeKind }: RulePanelProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">推导规则</div>
      {ALL_KINDS.map((kind) => {
        const meta = KIND_META[kind]
        const isActive = activeKind === kind
        return (
          <div
            key={kind}
            className={`p-2.5 rounded-lg border text-xs transition-all duration-200 ${
              isActive
                ? `${meta.bg} border-opacity-100`
                : 'bg-gray-900/30 border-gray-800 opacity-50'
            }`}
          >
            <span className={`font-bold ${meta.color}`}>{meta.label}</span>
            <span className="text-gray-300 ml-2 leading-relaxed">{meta.rule}</span>
          </div>
        )
      })}
      {!activeKind && (
        <p className="text-xs text-gray-600 italic pt-1">← 点击左侧 Props 激活对应规则</p>
      )}
    </div>
  )
}
