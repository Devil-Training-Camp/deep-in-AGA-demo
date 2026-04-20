import { useState, useCallback, useRef, useEffect } from 'react'

export interface SearchBarProps {
  placeholder?: string
  defaultValue?: string
  debounceMs?: number
  onSearch: (query: string) => void
  onClear?: () => void
  disabled?: boolean
}

export function SearchBar({
  placeholder = '搜索...',
  defaultValue = '',
  debounceMs = 300,
  onSearch,
  onClear,
  disabled = false,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      setValue(next)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onSearch(next), debounceMs)
    },
    [onSearch, debounceMs]
  )

  const handleClear = useCallback(() => {
    setValue('')
    onSearch('')
    onClear?.()
  }, [onSearch, onClear])

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded border px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      {value && !disabled && (
        <button
          onClick={handleClear}
          className="absolute right-2 text-gray-400 hover:text-gray-600"
          aria-label="清除搜索"
        >
          ✕
        </button>
      )}
    </div>
  )
}
