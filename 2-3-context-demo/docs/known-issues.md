# 历史问题记录

> 遇到新坑后，用以下 prompt 补充：
> "根据我们刚才的交互，把这个问题总结补充到 `docs/known-issues.md`，格式参考已有条目，说清楚：现象、根因、解决方案、相关代码位置。"

---

## 问题 1：注册成功但无法登录（已修复）

**现象**：用户注册时密码填 4 位能通过表单校验，但注册后尝试登录时提示"密码格式不正确"，需要重置密码才能继续。

**根因**：`registerInputSchema` 里密码最小长度设为 4，`loginInputSchema` 里设为 5，两者不一致。注册表单能通过，登录表单却拒绝。

**解决方案**：两个 schema 密码最小长度统一为 5。相关文件：`src/lib/auth.tsx`（`registerInputSchema`、`loginInputSchema` 定义处）。

**教训**：修改任一校验 schema 时，必须同步检查对端 schema，并在 `__tests__/` 中增加边界校验测试。

---

## 问题 2：barrel files 导致 Vite 打包变慢

**现象**：随着 feature 数量增加，`pnpm build` 从 15 秒涨到 45 秒。本地 HMR 热更新也变慢。

**根因**：之前推荐在每个 feature 下创建 `index.ts` 统一导出所有内容。这种写法让 Vite 无法做 tree-shaking——import 任何一个 feature 会把整个 feature 的所有代码都打包进来。

**解决方案**：删除所有 `index.ts` barrel file，改为直接 import 具体文件路径：

```ts
// ❌ 之前（barrel file）：Vite 会把 discussions feature 整个打包进来
import { DiscussionCard } from '@/features/discussions';

// ✅ 现在（直接导入）：Vite 只打包用到的文件
import { DiscussionCard } from '@/features/discussions/components/discussion-card';
```

**注意**：新加文件不允许在 `features/` 下创建 `index.ts`，代码 review 时发现即拒绝合并。`components/ui/` 下的 index.ts 不受此限制。

---

## 问题 3：React Query 缓存导致数据不刷新

**现象**：用户删除一条 discussion 后，列表页还能看到已删除的条目。刷新页面才消失。

**根因**：删除操作成功后没有让相关 query 缓存失效（`invalidateQueries`）。TanStack Query 的 `staleTime` 默认 0，但如果没有主动失效，缓存的旧数据还在。

**解决方案**：所有写操作（POST/PUT/PATCH/DELETE）成功后必须 invalidate 相关 query key：

```ts
useMutation({
  mutationFn: deleteDiscussion,
  onSuccess: () => {
    // ✅ 写操作成功后让列表缓存失效
    queryClient.invalidateQueries({ queryKey: ['discussions'] });
  },
});
```

相关 query key 统一定义，避免字符串散落各处。

---

## 问题 4：React Context 滥用导致全局重渲染

**现象**：讨论列表在用户切换通知状态（已读/未读）后，整个页面闪烁重渲染一次。

**根因**：把通知状态放进了 React Context，订阅该 Context 的所有组件（包括 discussion 列表）都跟着重渲。实际上 discussion 列表根本不依赖通知状态。

**解决方案**：把高频更新的状态（通知、用户状态）迁移到 Zustand store。React Context 只用于低频更新的数据（主题、当前用户信息）。

```ts
// ❌ 高频状态不适合放 Context
const NotificationContext = React.createContext(notifications);

// ✅ 高频状态用 Zustand，组件通过 selector 订阅，精确更新
const useNotificationStore = create((set) => ({
  notifications: [],
  addNotification: (notification) => set((state) => ({...})),
}));
```

相关文件：`src/components/ui/notifications/notifications-store.ts`、`src/components/ui/notifications/`。

---

## 问题 5：跨 feature import 被 ESLint 拦截

**现象**：在 `discussions` feature 里直接 import 了 `comments` feature 的类型，CI 报 ESLint 错误导致流水线失败。

**根因**：项目通过 `eslint-plugin-import` 的 `no-restricted-paths` 规则强制 feature 间单向依赖，跨 feature import 会直接 lint error。

**解决方案**：把共用类型提升到 `src/types/api.ts`（全局类型），或在 `app/` 层做跨 feature 组合。不允许 `features/discussions` import `features/comments`。

如需跨 feature 共享逻辑，先在 `#architecture` 频道讨论，评估是否应提升到 `components/` 或 `lib/`。
