# 演示项目

一个极简 React 应用，用于演示 Claude Code 的上下文工程三大接口。

代码在 `src/`，下文路径均相对于该目录。

## 常用命令

```sh
pnpm dev    # 启动开发服务器（localhost:5173）
pnpm build  # 生产构建
```

## 技术栈

| 用途 | 库 | 备注 |
|------|----|----|
| 构建 | Vite 5 | |
| UI | React 18 + TypeScript | |
| 样式 | Tailwind CSS v3 | **唯一允许的样式方案** |

**禁止**：inline style、CSS Modules、styled-components、任何新 npm 依赖。

## 组件规范

每个组件必须定义独立的 TypeScript Props 接口，禁止 `any`：

```tsx
// ✅ 正确
interface ButtonProps {
  label: string;
  variant: 'primary' | 'danger' | 'success';
  onClick: () => void;
}

// ❌ 错误：用 any 或不定义接口
export function Button({ label, onClick }: any) { ... }
```

## 颜色规范

按钮颜色**必须**使用以下 Tailwind class，禁止硬编码色值：

| variant | class |
|---------|-------|
| primary | `bg-blue-500 hover:bg-blue-600 text-white` |
| danger  | `bg-red-500 hover:bg-red-600 text-white` |
| success | `bg-green-500 hover:bg-green-600 text-white` |

## 已知问题

见 `docs/known-issues.md`。
