---
name: react-patterns
description: React 组件开发规范，包含类型定义、Hooks 使用、组件拆分原则。作为背景知识自动加载。
user-invocable: false
---

# React 开发规范（项目内部标准）

## 类型定义
- 所有 Props 必须定义独立 interface，命名为 `<ComponentName>Props`
- 禁止使用 `any`，用 `unknown` + 类型守卫替代
- 异步数据用 `T | null` 表示未加载状态

## Hooks 规范
- useEffect 的依赖数组必须完整，禁止用 `// eslint-disable-line`
- 复用逻辑抽取为 `useXxx` 自定义 Hook

## 组件拆分原则
- 单组件不超过 150 行
- 展示逻辑和数据获取分离：`UserList`（展示）+ `useUsers`（数据）
