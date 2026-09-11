# `components/` — React UI 组件

前端 UI 统一基于 **shadcn/ui**(Tailwind v4 + Radix UI)实现。配置见仓库根同级的 `components.json`。

## 放什么

- `ui/` — **shadcn/ui 组件**。由 CLI 生成或从官方复制而来的源码,直接住在仓库里(shadcn 的分发模式:代码即所有权,可随意改)。已 lint-ignore(见根 `.eslintrc.json`),避免 vendored 代码触发严格规则。
- 其余业务组合组件(如 `chat/`、`knowledge-base/`)按功能域建子目录,复用 `ui/` 里的原子组件。

## 添加组件

在 `packages/web/` 目录下执行(shadcn CLI 按 `components.json` 定位):

```
pnpm dlx shadcn@latest add <component>
```

例如 `add dialog input textarea sonner`。组件落到 `src/components/ui/`,工具函数复用 `@/lib/utils` 的 `cn()`。

## 约定

- 类名合并一律用 `@/lib/utils` 的 `cn()`,勿手写 `clsx`/`twMerge`。
- 主题 token(颜色、圆角)定义在 `src/app/globals.css` 的 `:root` / `.dark`,改主题改这里,不在组件里写死颜色。
- 图标用 `lucide-react`。
