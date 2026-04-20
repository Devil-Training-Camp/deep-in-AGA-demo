---
name: check-props-declarative
description: Check React component props using declarative goal-oriented instructions
allowed-tools: Read, Glob, Grep
---

# 检查组件 Props（声明式）

分析 `src/components/` 目录下的所有 React 组件，识别每个组件的 Props 类型定义。

## 检查内容

- 找出所有定义了 Props 接口的组件
- 检查每个 Props 字段是否都有明确的 TypeScript 类型（不使用 any）
- 识别哪些字段是必填、哪些是可选（有无 `?`）
- 标记缺少 Props 类型定义的组件

## 输出格式

完成后按组件逐一列出：

```
✅ Button.tsx — 6 个 Props，类型完整
  - children: ReactNode（必填）
  - variant?: ButtonVariant
  - ...

⚠️ UserList.tsx — Props 缺失，直接使用 any[]
```

## 注意事项

- 如果找不到 `src/components/` 目录，提示用户确认路径
- 不修改任何文件，只读取和分析
