# 复杂组件 Stories 示例

适用于 Props 较多（>5个）或有异步、受控状态、回调的组件。

## 示例：SearchBar 组件（有 debounce、受控输入、回调）

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SearchBar } from './SearchBar'

const meta = {
  title: 'Components/SearchBar',
  component: SearchBar,
  parameters: { layout: 'centered' },
  argTypes: {
    onSearch: { action: 'searched' },
    onClear: { action: 'cleared' },
    debounceMs: { control: { type: 'range', min: 0, max: 1000, step: 100 } },
  },
  args: {
    onSearch: () => {},
    debounceMs: 300,
  },
} satisfies Meta<typeof SearchBar>

export default meta
type Story = StoryObj<typeof meta>

// 基础用法
export const Default: Story = {}

// 带初始值
export const WithDefaultValue: Story = {
  args: { defaultValue: 'React hooks' },
}

// 禁用状态
export const Disabled: Story = {
  args: { disabled: true, defaultValue: '不可编辑' },
}

// 受控模式：展示如何在父组件中使用
export const Controlled: Story = {
  render: (args) => {
    const [results, setResults] = useState<string[]>([])
    return (
      <div style={{ width: 300 }}>
        <SearchBar
          {...args}
          onSearch={(q) => setResults(q ? [`结果 1: ${q}`, `结果 2: ${q}`] : [])}
        />
        <ul style={{ marginTop: 8 }}>
          {results.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </div>
    )
  },
}
```

## 规则

- Props 超过 5 个时，用 `argTypes` 细化每个 Prop 的控件类型
- 有回调 Prop（onXxx）的一律加 `{ action: '...' }`
- 受控场景必须有一个用 `render` 函数封装父组件状态的 story
- 异步/副作用逻辑（如 debounce）在 story 描述里注明延迟时间
