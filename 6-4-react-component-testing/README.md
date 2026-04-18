# AI 从 Props 推导测试场景

> 对应文章：[React 组件测试：让 AI 从 Props 推导交互场景](../../drafts/6-4-react-component-testing.md)

## 这个 Demo 演示什么

以 `SearchForm` 组件为例，可视化展示 AI 如何从 TypeScript Props 类型定义系统地推导出完整的测试场景集合。

## 运行方式

```bash
pnpm install
pnpm --filter @demos/6-4-react-component-testing run dev
```

## 演示要点

- 点击左侧任意 Prop，右侧高亮显示该 Prop 推导出的所有测试场景
- 推导规则面板实时激活，展示对应 Prop 类型的推导逻辑
- 点击任意场景卡片展开，查看 AI 生成的完整测试代码
- 覆盖四类场景：渲染测试、交互测试、边界场景、状态分支
