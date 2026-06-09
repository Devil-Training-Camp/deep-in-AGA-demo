# 前端开发规范

## 组件
- 使用函数组件 + hooks，不用类组件
- 单组件不超过 200 行，超出拆分为子组件
- 组件文件放 `src/components/`，页面级组件放 `src/pages/`

## 状态管理
- 服务端数据用 TanStack Query（`useQuery` / `useMutation`）
- 全局 UI 状态用 Zustand，不用 Redux
- 表单用 React Hook Form + Zod，不用 Formik

## 样式
- 用 Tailwind CSS utility class，不用 CSS Modules
- 组件库用 Radix UI（headless），不引入 MUI / Ant Design

## TypeScript
- 禁止 `any`，用 `unknown` + type guard 替代
- API 响应必须有 Zod schema 做运行时校验
- 组件 props 必须有明确类型定义

## 命名
- 组件文件：`PascalCase.tsx`
- hooks：`useXxx.ts`
- 工具函数：`camelCase.ts`
