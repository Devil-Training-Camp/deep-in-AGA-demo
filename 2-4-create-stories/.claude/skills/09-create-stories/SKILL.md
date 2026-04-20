---
name: create-stories
description: Generate Storybook stories for React components. Use when user wants to create stories for a component or mentions "Storybook documentation"
allowed-tools: Read, Write, Glob
---

# 生成 Storybook Stories

## 执行步骤

1. 读取用户指定的组件文件，分析 Props 类型定义，识别所有可选和必选 Props

2. 根据组件复杂度选择参考示例：
   - Props ≤ 5 个：参考 [examples/basic.md](examples/basic.md)
   - Props > 5 个或有回调/受控状态：参考 [examples/complex.md](examples/complex.md)

3. 参考 [template.stories.tsx](template.stories.tsx) 生成 stories 文件
   - 文件名：`<ComponentName>.stories.tsx`
   - 位置：与组件文件同目录

4. 生成的文件必须包含：
   - [ ] `Default` story（最基础展示）
   - [ ] 枚举类型 Prop 的 `AllVariants` story
   - [ ] `Interactive` story（通过 Controls 动态调整 Props）
   - [ ] 有回调的 Prop 加 `{ action: '...' }`

## 注意事项

- 如果组件已有 stories 文件，询问用户是否覆盖
- 对于函数类型的 Prop（onXxx），在 argTypes 中配置 `{ action: 'xxx' }`
- 完成后输出生成的文件路径和包含的 story 列表
