# 2.6 配套组件库

这是 MCP 演示的目标项目，模拟一个已有 React 组件库的前端项目。

## 启动

```bash
pnpm --filter @demos/2-6-component-library run dev
```

打开 http://localhost:5173 查看组件展示页面。

## 组件列表

| 组件 | 文件 | Story 文件 |
|------|------|-----------|
| Button | `src/components/Button.tsx` | `src/stories/Button.stories.tsx` |
| Badge  | `src/components/Badge.tsx`  | `src/stories/Badge.stories.tsx`  |
| Card   | `src/components/Card.tsx`   | `src/stories/Card.stories.tsx`   |

## Stories 格式说明

每个 `.stories.tsx` 文件包含：

1. **顶部 JSDoc 注释** — 描述组件用途、完整 Props 说明、设计约束
2. **Story 导出** — 各种变体的实际用法示例

这套格式是 MCP Server 读取的数据来源。MCP Server 通过读取这些文件，让 AI 能了解组件库的完整 API。

## 配合 MCP Server 使用

参见 `demos/2-6-mcp-server/DEMO.md` 中的完整演示脚本。
