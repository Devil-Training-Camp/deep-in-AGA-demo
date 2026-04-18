# 编码规范

> 来源：[bulletproof-react/docs/project-standards.md](https://github.com/alan2207/bulletproof-react/blob/main/docs/project-standards.md) + [components-and-styling.md](https://github.com/alan2207/bulletproof-react/blob/main/docs/components-and-styling.md)

## 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 组件文件 | kebab-case（ESLint 强制） | `discussion-preview.tsx` |
| 目录 | kebab-case | `features/discussions/` |
| React 组件名 | PascalCase | `DiscussionPreview` |
| 变量 / 函数 | camelCase | `getDiscussion` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL` |
| 类型 / 接口 | PascalCase | `CreateDiscussionInput` |
| 自定义 Hook | `use` 开头 | `useDiscussions` |

## 组件规范

**函数式组件，禁止类组件**。

Props 必须有独立的 TypeScript 接口，禁止 `any`：

```tsx
// ✅ 正确
interface DiscussionCardProps {
  discussionId: string;
  onDelete: (id: string) => void;
}

export function DiscussionCard({ discussionId, onDelete }: DiscussionCardProps) {
  const { discussion } = useDiscussion(discussionId); // 业务逻辑在 hook 里
  // ...
}

// ❌ 错误：Props 用 any，直接在组件里调 API
export function DiscussionCard({ discussionId, onDelete }: any) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/discussions/${discussionId}`).then(setData); // 直接调 API
  }, []);
}
```

单个组件不超过 200 行，超出拆子组件。嵌套 render 函数直接提取为独立组件。

## import 路径规范

统一使用 `@/` 绝对路径，禁止多层相对路径：

```ts
// ✅ 正确
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useDiscussions } from '../api/get-discussions'; // 同 feature 内可用相对路径

// ❌ 错误：多层相对路径容易随文件移动失效
import { api } from '../../../lib/api-client';
```

**`features/` 下禁止 barrel files**：`features/` 内不允许用 `index.ts` 做 re-export，直接 import 具体文件路径（会导致 Vite tree-shaking 失效引发性能问题）。`components/ui/` 下的 `index.ts` 是允许的：

```ts
// ❌ 错误（features 层）：通过 barrel file 导入
import { DiscussionCard } from '@/features/discussions';

// ✅ 正确：直接导入具体文件
import { DiscussionCard } from '@/features/discussions/components/discussion-card';

// ✅ 允许（components/ui 层）：UI 组件库可以用 index.ts 统一导出
import { useNotifications } from '@/components/ui/notifications';
```

## import 顺序

```ts
// 1. 第三方库
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 2. 项目内部（绝对路径，@/ 开头）
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

// 3. 同 feature 相对路径
import { getDiscussionsQueryOptions } from './get-discussions';
```

## 表单规范

表单统一用 React Hook Form + Zod，Zod schema 和表单组件放在一起：

```tsx
const loginInputSchema = z.object({
  email: z.string().min(1, 'Required').email('Invalid email'),
  password: z.string().min(5, 'Required'),
});

type LoginInput = z.infer<typeof loginInputSchema>;
```

注意：`registerInputSchema` 的密码最小长度与 `loginInputSchema` 必须保持一致（均为 `min(5)`），历史上曾因不一致导致"注册成功但无法登录"的 bug（见 `docs/known-issues.md` 问题 1）。

## 自动化检查

提交前 Husky 自动运行 ESLint + Prettier + TypeScript 检查，不通过不允许提交。

遇到格式问题：
```sh
yarn lint         # 自动修复 ESLint 和 Prettier 问题（--fix 模式）
yarn check-types  # 单独跑 TS 类型检查
```
