---
name: component-generator
description: 根据 Figma 组件链接生成 React 组件，自动读取 Design Tokens、分发给 styling-agent 和 testing-agent 并行处理
---

## 执行步骤

### 1. 读取设计规范

通过 Figma MCP 读取传入的组件链接，提取：

- 组件名称和层级结构
- 使用的颜色、间距、字体（与 `src/tokens/design-tokens.ts` 对照）
- 交互状态（hover、active、disabled）

### 2. 生成组件框架

在 `src/components/{ComponentName}/` 下创建两个文件：

**{ComponentName}.tsx**（仅写结构和 Props，不写样式）：

```tsx
interface {ComponentName}Props {
  // 从 Figma 设计规范推导出的 Props
}

export function {ComponentName}(props: {ComponentName}Props) {
  // 返回语义化 HTML 结构，className 留空等待 styling-agent 填充
}
```

**index.ts**：

```ts
export { {ComponentName} } from './{ComponentName}';
export type { {ComponentName}Props } from './{ComponentName}';
```

### 3. 并行分发子任务

生成框架后，同时调用两个 Subagent：

- **styling-agent**：填充 Tailwind CSS 样式，确保设计还原度和响应式
- **testing-agent**：生成完整单元测试，覆盖渲染、交互、边界情况

### 4. 输出报告

两个 Subagent 完成后，汇总输出：

- 生成的文件列表
- 关键设计决策说明（如 Token 映射关系）
- 测试覆盖情况摘要

## 用法

```
/component-generator https://www.figma.com/design/.../ComponentName
```
