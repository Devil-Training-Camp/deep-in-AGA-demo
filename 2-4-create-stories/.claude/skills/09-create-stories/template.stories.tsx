import type { Meta, StoryObj } from '@storybook/react'
import { ComponentName } from './ComponentName'

// Meta 配置：定义组件级别的 Storybook 设置
const meta = {
  title: 'Components/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered',
  },
  // argTypes 控制 Storybook Controls 面板的展示方式
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
    },
    onClick: { action: 'clicked' },
  },
  // 默认 args，所有 story 都继承
  args: {
    children: 'Button',
  },
} satisfies Meta<typeof ComponentName>

export default meta
type Story = StoryObj<typeof meta>

// Default：最基础的展示，不传任何额外 Props
export const Default: Story = {}

// 展示所有 variant
export const AllVariants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 8 }}>
      <ComponentName {...args} variant="primary">Primary</ComponentName>
      <ComponentName {...args} variant="secondary">Secondary</ComponentName>
      <ComponentName {...args} variant="danger">Danger</ComponentName>
    </div>
  ),
}

// 交互式：通过 Controls 面板动态调整所有 Props
export const Interactive: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
  },
}

// 禁用状态
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
}

// Loading 状态
export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading...',
  },
}
