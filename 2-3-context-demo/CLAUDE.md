# bulletproof-react

React 18 + TypeScript SPA，业务场景为多租户团队讨论论坛。
代码在 `apps/react-vite/src/`，下文路径均相对于该目录。

## 常用命令

```sh
# 在 apps/react-vite/ 下执行
yarn dev          # 启动开发服务器（自动挂载 MSW mock，不需要真实后端）
yarn test         # 单元测试（Vitest + Testing Library）
yarn lint         # ESLint 检查
yarn check-types  # TypeScript 类型检查（不编译，只检查类型）
yarn build        # 生产构建（先跑 tsc 再 vite build）
```

## 技术选型

| 用途 | 库 | 备注 |
|------|----|------|
| 构建 | Vite 5 | |
| 路由 | React Router v7 | 路由级 lazy loading |
| 服务端数据 | TanStack Query v5 | 所有远程状态的缓存、loading、error |
| 全局 UI 状态 | Zustand v4 | 当前仅通知系统在用：`components/ui/notifications/notifications-store.ts` |
| 表单 | React Hook Form v7 + Zod v3 | schema 与 form 放同一文件 |
| 样式 | Tailwind CSS v3 + Radix UI | headless 无样式组件 + utility class |
| 认证 | react-query-auth（封装 TanStack Query）| 配置见 `lib/auth.tsx` |

引入新依赖须先开 issue 说明理由。以下库已明确排除，不再评估：Redux、MobX（Zustand 替代）、Formik（RHF 替代）、SWR（TanStack Query 替代）。

## 架构约束

**跨 feature 禁止横向 import**，由 `eslint-plugin-import` 的 `no-restricted-paths` 规则强制：

```
features/auth        ←×→  features/discussions
features/discussions ←×→  features/comments
features/comments    ←×→  features/users
...（所有 feature 两两禁止）
```

跨 feature 的组合只能在 `app/routes/` 完成。违反即 lint error，CI 会拦截。

**单向依赖**（ESLint 强制，禁止反向）：

```
shared（lib / components / hooks / types / utils）→ features → app
```

**API 三件套**：每个 `features/*/api/*.ts` 文件必须同时包含：

1. Zod schema（`z.object({...})`，用于运行时校验和类型推导）
2. fetcher 函数（调 `lib/api-client.ts` 的 axios 实例，不允许在组件里直接用 `api.get/post`）
3. TanStack Query hook（`useQuery` 或 `useMutation`）

**`features/` 禁止 barrel files**：不允许建 `features/*/index.ts` 做 re-export，Vite tree-shaking 会失效。`components/ui/` 下的 index.ts 不受此限。

## 已知陷阱

见 `docs/known-issues.md`。最常踩：**写操作后忘记 `invalidateQueries`**（问题 3）。
