# 架构说明

> 来源：[bulletproof-react/docs/project-structure.md](https://github.com/alan2207/bulletproof-react/blob/main/docs/project-structure.md) 等

## 目录结构

```
src/
├── app/               # 应用层：路由配置、全局 Provider、页面组合
│   ├── routes/        # 路由定义（公开路由 / 受保护路由分开）
│   ├── index.tsx      # 应用入口
│   ├── provider.tsx   # 全局 Provider 组合（QueryClient、Router 等）
│   └── router.tsx
├── assets/            # 静态资源（图片、字体等）
├── components/        # 全局共享 UI 组件，无业务逻辑
├── config/            # 环境变量、全局配置常量
├── features/          # 业务功能模块
│   ├── auth/          # 认证（登录、注册、权限守卫）
│   ├── discussions/   # 讨论帖子（CRUD + 分页）
│   ├── comments/      # 评论（隶属于 discussion）
│   ├── teams/         # 团队管理（多租户）
│   └── users/         # 用户资料
├── hooks/             # 全局复用 hooks
├── lib/               # 预配置库实例
│   ├── api-client.ts     # axios 实例（所有 API 请求入口）
│   ├── auth.tsx          # 认证配置（react-query-auth）
│   ├── authorization.tsx # 权限守卫（ProtectedRoute）
│   └── react-query.ts    # QueryClient 配置
├── testing/           # 测试工具、MSW mock handlers
├── types/             # 全局 TypeScript 类型（api.ts 等）
└── utils/             # 全局工具函数
```

每个 feature 内部结构（按需创建，不是每个都需要全部）：

```
features/discussions/
├── api/         # API 调用（Zod schema + fetcher + TanStack Query hook 三件套）
├── components/  # 该 feature 专属组件
├── hooks/       # 该 feature 专属 hooks
├── types/       # 该 feature 的 TS 类型
└── utils/       # 该 feature 的工具函数
```

## 数据流

状态分五类，分别用不同方案管理：

| 状态类型 | 说明 | 技术选型 |
|---------|------|---------|
| Component State | 组件内部状态，不共享 | `useState` / `useReducer` |
| Application State | 全局 UI 状态（通知、modal、主题）| Zustand |
| Server Cache State | 从服务器拉取并缓存的数据 | TanStack Query |
| Form State | 表单字段值和校验 | React Hook Form + Zod |
| URL State | 存在 URL 参数里的状态（页码、筛选条件）| React Router + `useSearchParams` |

数据流方向：

```
用户操作 → React 组件
         → React Hook Form（表单输入）
         → TanStack Query（服务端数据，自动缓存）
         → Zustand（全局 UI 状态）
         → useState（本地 UI 状态，如 modal 开关）
```

## 单向依赖架构

代码只能从左往右流动，禁止反向：

```
shared（components / hooks / lib / types / utils）
  ↓
features（auth / discussions / comments / teams / users）
  ↓
app（routes / provider / router）
```

**feature 间横向 import 被 ESLint 禁止**：`discussions` 不能 import `comments`，`auth` 不能 import `discussions`。Feature 间的组合在 `app/routes/` 层完成。

## API 层规范

所有 API 请求必须走 `src/lib/api-client.ts` 的 axios 实例，不允许在组件里直接写 `fetch`。

每个 API 文件（如 `features/discussions/api/get-discussions.ts`）包含三部分：

```typescript
// 1. Zod schema（类型定义 + 运行时校验）
export const createDiscussionInputSchema = z.object({
  title: z.string().min(1, 'Required'),
  body: z.string().min(1, 'Required'),
});

export type CreateDiscussionInput = z.infer<typeof createDiscussionInputSchema>;

// 2. Fetcher 函数（调 api-client，处理数据转换）
export const createDiscussion = ({
  data,
}: {
  data: CreateDiscussionInput;
}): Promise<Discussion> => {
  return api.post('/discussions', data);
};

// 3. TanStack Query hook（管理缓存、loading、error）
export const useCreateDiscussion = ({ mutationConfig }: ...) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDiscussion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    },
    ...mutationConfig,
  });
};
```
