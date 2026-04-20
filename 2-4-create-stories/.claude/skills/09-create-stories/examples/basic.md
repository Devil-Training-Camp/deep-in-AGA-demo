# 基础组件 Stories 示例

适用于 Props 较少（≤5个）、无复杂交互的组件。

## 示例：Badge 组件

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'New' },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
    </div>
  ),
}
```

## 规则

- 每个枚举类型的 Prop 都要有对应的 AllVariants story
- 必填 Props 写在 `args` 里，可选 Props 在需要展示时才加
- story 名称用英文，`PascalCase`
