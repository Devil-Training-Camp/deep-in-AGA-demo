# UserCard 组件库项目

> 这是"能力协同"Demo 的上下文管理示例。
> 会话启动时 Claude Code 自动读取本文件，无需每次重复说明规范。

## 技术规范

- 框架：React 18 + TypeScript（严格模式）
- 样式：Tailwind CSS，颜色/间距/字体统一使用 `src/tokens/design-tokens.ts`
- 测试：Vitest + @testing-library/react，覆盖率目标 80%

## 组件开发规范

每个组件放在 `src/components/{ComponentName}/` 目录下，包含三个文件：

- `{ComponentName}.tsx`：组件主文件，Props 必须用 TypeScript interface 定义
- `{ComponentName}.test.tsx`：单元测试，覆盖渲染、交互、边界情况
- `index.ts`：仅做导出，不含逻辑

禁止在组件内硬编码颜色值（如 `#2563eb`），必须从 Design Tokens 导入。

## Design Tokens 说明

`src/tokens/design-tokens.ts` 由 Figma MCP 自动同步生成，代表设计稿的真实规范。
修改 UI 时先查阅 Tokens，而非自行猜测颜色和间距。

## 提交规范

- commit message：`feat(component): 添加 XXX 组件`
- PR 描述必须包含：改动说明 + 测试通过截图
- 每个组件对应一个独立 PR，不要批量提交

## 禁止操作

- 不得直接修改 `node_modules/`、`dist/`
- 不得删除测试文件
- 不得绕过 TypeScript 类型检查（禁用 `@ts-ignore`）
