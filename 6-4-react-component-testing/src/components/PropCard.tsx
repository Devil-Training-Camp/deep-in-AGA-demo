import { PropDef, KIND_META } from '../data'

interface PropCardProps {
  prop: PropDef
  isSelected: boolean
  isHighlighted: boolean
  onClick: () => void
}

export function PropCard({ prop, isSelected, isHighlighted, onClick }: PropCardProps) {
  const meta = KIND_META[prop.kind]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
        isSelected
          ? `${meta.bg} border-opacity-100 shadow-lg scale-[1.01]`
          : isHighlighted
          ? 'bg-gray-800 border-gray-600'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5 ${
          isSelected ? meta.color : 'text-gray-500'
        } bg-black/30`}>
          {meta.label}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-sm text-blue-300 font-semibold">{prop.name}</span>
            {!prop.required && (
              <span className="text-gray-500 text-xs">optional</span>
            )}
          </div>
          <div className="font-mono text-xs text-gray-400 mt-0.5">{prop.type}</div>
          {isSelected && (
            <div className="text-xs text-gray-300 mt-1.5 leading-relaxed">{prop.description}</div>
          )}
        </div>
      </div>
    </button>
  )
}
