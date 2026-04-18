export type PropKind = 'callback' | 'boolean' | 'required' | 'optional' | 'union'

export interface PropDef {
  name: string
  type: string
  kind: PropKind
  required: boolean
  description: string
}

export interface TestScenario {
  id: string
  title: string
  propNames: string[]   // which props this scenario derives from
  category: string
  code: string
}

export const PROPS: PropDef[] = [
  {
    name: 'onSearch',
    type: '(query: string) => void',
    kind: 'callback',
    required: true,
    description: '触发搜索的回调，参数为 trimmed query',
  },
  {
    name: 'onClear',
    type: '() => void',
    kind: 'callback',
    required: false,
    description: '点击清空按钮时触发的回调',
  },
  {
    name: 'disabled',
    type: 'boolean',
    kind: 'boolean',
    required: false,
    description: '禁用输入框和所有按钮',
  },
  {
    name: 'loading',
    type: 'boolean',
    kind: 'boolean',
    required: false,
    description: '加载状态，按钮文字变为"搜索中..."',
  },
  {
    name: 'placeholder',
    type: 'string',
    kind: 'optional',
    required: false,
    description: '输入框占位符，默认"请输入搜索关键词"',
  },
  {
    name: 'defaultValue',
    type: 'string',
    kind: 'optional',
    required: false,
    description: '输入框初始值，默认为空字符串',
  },
]

export const SCENARIOS: TestScenario[] = [
  {
    id: 'render-placeholder',
    title: '初始渲染：显示默认 placeholder',
    propNames: ['placeholder'],
    category: '渲染测试',
    code: `it('显示默认 placeholder', () => {
  render(<SearchForm onSearch={mockOnSearch} />)
  expect(
    screen.getByPlaceholderText('请输入搜索关键词')
  ).toBeInTheDocument()
})`,
  },
  {
    id: 'render-button-disabled',
    title: '初始渲染：query 为空时搜索按钮禁用',
    propNames: ['onSearch'],
    category: '渲染测试',
    code: `it('query 为空时搜索按钮禁用', () => {
  render(<SearchForm onSearch={mockOnSearch} />)
  expect(
    screen.getByRole('button', { name: '搜索' })
  ).toBeDisabled()
})`,
  },
  {
    id: 'render-default-value',
    title: '有 defaultValue 时搜索按钮可用',
    propNames: ['defaultValue', 'onSearch'],
    category: '渲染测试',
    code: `it('有 defaultValue 时搜索按钮可用', () => {
  render(
    <SearchForm onSearch={mockOnSearch} defaultValue="react" />
  )
  expect(
    screen.getByRole('button', { name: '搜索' })
  ).toBeEnabled()
})`,
  },
  {
    id: 'interact-type',
    title: '输入关键词后搜索按钮变为可用',
    propNames: ['onSearch'],
    category: '交互测试',
    code: `it('输入关键词后搜索按钮变为可用', async () => {
  const user = userEvent.setup()
  render(<SearchForm onSearch={mockOnSearch} />)

  await user.type(
    screen.getByLabelText('搜索关键词'), 'react'
  )

  expect(
    screen.getByRole('button', { name: '搜索' })
  ).toBeEnabled()
})`,
  },
  {
    id: 'interact-search',
    title: '点击搜索触发 onSearch，传入 trimmed query',
    propNames: ['onSearch'],
    category: '交互测试',
    code: `it('点击搜索触发 onSearch（trimmed）', async () => {
  const user = userEvent.setup()
  render(<SearchForm onSearch={mockOnSearch} />)

  await user.type(
    screen.getByLabelText('搜索关键词'), '  react  '
  )
  await user.click(
    screen.getByRole('button', { name: '搜索' })
  )

  expect(mockOnSearch).toHaveBeenCalledWith('react')
  expect(mockOnSearch).toHaveBeenCalledTimes(1)
})`,
  },
  {
    id: 'interact-enter',
    title: '按 Enter 键触发搜索',
    propNames: ['onSearch'],
    category: '交互测试',
    code: `it('按 Enter 键触发搜索', async () => {
  const user = userEvent.setup()
  render(<SearchForm onSearch={mockOnSearch} />)

  await user.type(
    screen.getByLabelText('搜索关键词'), 'typescript'
  )
  await user.keyboard('{Enter}')

  expect(mockOnSearch).toHaveBeenCalledWith('typescript')
})`,
  },
  {
    id: 'interact-whitespace',
    title: '只有空格时不触发搜索',
    propNames: ['onSearch'],
    category: '边界场景',
    code: `it('只有空格时不触发搜索', async () => {
  const user = userEvent.setup()
  render(<SearchForm onSearch={mockOnSearch} />)

  await user.type(
    screen.getByLabelText('搜索关键词'), '   '
  )
  await user.click(
    screen.getByRole('button', { name: '搜索' })
  )

  expect(mockOnSearch).not.toHaveBeenCalled()
})`,
  },
  {
    id: 'interact-clear',
    title: '点击清空：输入框清空，onClear 被调用',
    propNames: ['onClear', 'onSearch'],
    category: '交互测试',
    code: `it('点击清空后输入框清空，onClear 被调用', async () => {
  const user = userEvent.setup()
  render(
    <SearchForm
      onSearch={mockOnSearch}
      onClear={mockOnClear}
    />
  )

  await user.type(
    screen.getByLabelText('搜索关键词'), 'react'
  )
  await user.click(
    screen.getByRole('button', { name: '清空搜索' })
  )

  expect(screen.getByLabelText('搜索关键词'))
    .toHaveValue('')
  expect(mockOnClear).toHaveBeenCalledTimes(1)
})`,
  },
  {
    id: 'interact-clear-optional',
    title: 'onClear 未传时点击清空不报错',
    propNames: ['onClear'],
    category: '边界场景',
    code: `it('onClear 未传入时点击清空不报错', async () => {
  const user = userEvent.setup()
  render(<SearchForm onSearch={mockOnSearch} />)

  await user.type(
    screen.getByLabelText('搜索关键词'), 'react'
  )
  await expect(
    user.click(
      screen.getByRole('button', { name: '清空搜索' })
    )
  ).resolves.not.toThrow()
})`,
  },
  {
    id: 'state-disabled',
    title: 'disabled=true：输入框和按钮均禁用',
    propNames: ['disabled'],
    category: '状态分支',
    code: `it('disabled=true 时输入框和按钮均禁用', () => {
  render(
    <SearchForm
      onSearch={mockOnSearch}
      disabled
      defaultValue="react"
    />
  )
  expect(screen.getByLabelText('搜索关键词'))
    .toBeDisabled()
  expect(screen.getByRole('button', { name: '搜索' }))
    .toBeDisabled()
})`,
  },
  {
    id: 'state-loading-text',
    title: 'loading=true：按钮文字变为"搜索中..."',
    propNames: ['loading'],
    category: '状态分支',
    code: `it('loading=true 时按钮文字变为"搜索中..."', () => {
  render(
    <SearchForm
      onSearch={mockOnSearch}
      loading
      defaultValue="react"
    />
  )
  expect(
    screen.getByRole('button', { name: '搜索中' })
  ).toBeInTheDocument()
})`,
  },
  {
    id: 'state-loading-disabled',
    title: 'loading=true：输入框被禁用',
    propNames: ['loading'],
    category: '状态分支',
    code: `it('loading=true 时输入框被禁用', () => {
  render(<SearchForm onSearch={mockOnSearch} loading />)
  expect(screen.getByLabelText('搜索关键词'))
    .toBeDisabled()
})`,
  },
]

export const KIND_META: Record<PropKind, { label: string; color: string; bg: string; rule: string }> = {
  callback: {
    label: 'Callback',
    color: 'text-violet-300',
    bg: 'bg-violet-900/40 border-violet-700',
    rule: '每个 callback prop → 至少 1 个交互测试，验证调用参数',
  },
  boolean: {
    label: 'Boolean',
    color: 'text-amber-300',
    bg: 'bg-amber-900/40 border-amber-700',
    rule: '每个 boolean prop → 状态分支测试（true/false 各自的 UI 变化）',
  },
  required: {
    label: 'Required',
    color: 'text-red-300',
    bg: 'bg-red-900/40 border-red-700',
    rule: '必选 prop → 构成"正常路径"，所有核心行为必须覆盖',
  },
  optional: {
    label: 'Optional',
    color: 'text-sky-300',
    bg: 'bg-sky-900/40 border-sky-700',
    rule: '可选 prop → 默认值场景 + 传入非默认值的边界场景',
  },
  union: {
    label: 'Union/Enum',
    color: 'text-emerald-300',
    bg: 'bg-emerald-900/40 border-emerald-700',
    rule: '每个枚举值 → 独立的渲染变体测试',
  },
}

export const CATEGORY_COLOR: Record<string, string> = {
  '渲染测试': 'text-sky-400',
  '交互测试': 'text-violet-400',
  '边界场景': 'text-amber-400',
  '状态分支': 'text-emerald-400',
}
