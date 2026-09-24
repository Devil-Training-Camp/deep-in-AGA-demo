# 设计 Token 体系

> 智能知识问答系统的设计 token 参考。Tailwind v4（CSS-first）：所有 token 集中在 `src/app/globals.css`——`:root`/`.dark` 定义色值，`@theme inline` 注册成工具类并把 shadcn 语义名（`--background`/`--primary`/`--border`…）映射到我们的 token。改色值即改这一处，随后重新校验 WCAG AA 并同步本文档。

## 推导依据

token 不是凭空拍的，来自对 `doc/architecture-design.md` 描述的产品形态的三点判断：

1. **信息密度高**：文档管理列表、多轮对话流、历史与管理员审计的分页长列表，都是密集的数据列表/表格场景。→ 间距档位偏紧凑，正文默认档取 14px。
2. **交互场景明确**：SSE 流式问答（逐 token 渲染、中断按钮、grounded 依据标注）、文档四态异步入库（`pending`/`processing`/`ready`/`failed`）、删除二次确认、流内 `event:error`。→ 需要一套完整语义色，且能直接映射文档状态。
3. **色彩倾向克制、适合长时间阅读**：面向公司内部员工、本期不对外的工具。→ 偏冷、克制；主色取**靛蓝（indigo）**、不鲜艳跳眼；语义色与主色共存不冲突。

---

## 1. 颜色 token

### 明暗两套的组织方式

- 亮/暗**共用同一批 token 名称**，只是取值不同。色值写在 `src/app/globals.css` 的 `:root`（亮）与 `.dark`（暗）下，用具体色值（hex）。
- `@theme inline` 把这批 CSS 变量注册成 Tailwind v4 工具类（`bg-primary`、`text-foreground-muted`、`border-border-strong`…）；`inline` 表示引用变量而非复制值，所以 `.dark` 切换时工具类自动跟随。
- **接入 shadcn**：同一处把 shadcn 组件依赖的语义名（`--background`/`--foreground`/`--primary`/`--card`/`--muted`/`--destructive`/`--border`/`--ring`…）映射到我们的 token，shadcn 组件因此自动继承本主题，无需改组件源码。
- **切换方式**：在 `<html>` 上加/去 `dark` class（配 `@custom-variant dark`）。
- **对比度**：正文/文字与所在背景的组合均按 WCAG AA（≥4.5:1）校验；暗色主色作按钮表面用较暗档、作文本/边框时用更亮档（见下表备注）。
- **暗色处理原则**：背景用带冷灰的深色（非纯黑 `#000`），文字用柔和浅色（非纯白 `#fff`）；主色与语义色相应**提亮 + 降饱和**，避免深底刺眼。

### 主色 primary（靛蓝）

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `primary` (DEFAULT) | `#4f46e5` | `#5b5fe0` | 主按钮表面、选中态。暗色降饱和，配白字过 AA(5.05:1) |
| `primary-hover` | `#4338ca` | `#6366f1` | hover 态 |
| `primary-active` | `#3730a3` | `#818cf8` | 亮色=pressed；暗色兼作 primary 文本/边框的可读档(深底 5.41:1) |
| `primary-subtle` | `#eef2ff` | `#272a42` | 浅底：选中行背景、tag 底色 |
| `primary-foreground` | `#ffffff` | `#ffffff` | 主色之上的文字 |

### 辅助色 accent（青）

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `accent` (DEFAULT) | `#0e7490` | `#22d3ee` | grounded=true 依据标注、次级强调 |
| `accent-subtle` | `#ecfeff` | `#162e36` | 浅底 |
| `accent-foreground` | `#ffffff` | `#0f1115` | 辅助色之上的文字（暗色用近黑） |

### 背景与表面（界面骨架）

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `background` | `#f7f8fa` | `#161a20` | 页面背景（冷灰白 / 冷灰深，均不刺眼） |
| `surface` (DEFAULT) | `#ffffff` | `#1c212b` | 卡片 / 弹窗表面 |
| `surface-muted` | `#f1f3f6` | `#252b37` | 次级背景、hover 底 |
| `border` (DEFAULT) | `#e2e8f0` | `#333a47` | 分割线、卡片边框 |
| `border-strong` | `#cbd5e1` | `#475060` | 输入框边框 |

### 文字

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `foreground` (DEFAULT) | `#334155` | `#cbd5e1` | 正文主体（对所在表面均 ≥10:1） |
| `foreground-muted` | `#64748b` | `#94a3b8` | 次级文字：时间、状态描述 |
| `foreground-subtle` | `#94a3b8` | `#64748b` | 占位符、弱化图标 |
| `foreground-heading` | `#1e293b` | `#e2e8f0` | 标题 |

### 语义色 semantic（含状态映射）

每个语义色带 `DEFAULT` / `subtle`（浅底）/ `foreground`（其上文字）三档。文档四态直接映射，组件层不必再自定义状态色。暗色档均提亮降饱和，`foreground` 相应改为近黑 `#0f1115`。

| Token | Light | Dark | 用途 / 状态映射 |
|-------|-------|------|-----------------|
| `success` (DEFAULT) | `#15803d` | `#4ade80` | 文档 `ready`、操作成功 |
| `success-subtle` | `#f0fdf4` | `#142b1e` | 成功浅底 |
| `success-foreground` | `#ffffff` | `#0f1115` | success 之上文字 |
| `warning` (DEFAULT) | `#b45309` | `#fbbf24` | 文档 `pending`/`processing` 进行中、删除二次确认提示 |
| `warning-subtle` | `#fffbeb` | `#33270c` | 警告浅底 |
| `warning-foreground` | `#ffffff` | `#0f1115` | warning 之上文字 |
| `error` (DEFAULT) | `#dc2626` | `#f87171` | 文档 `failed`、删除操作、流内 `event:error` |
| `error-subtle` | `#fef2f2` | `#331818` | 错误浅底 |
| `error-foreground` | `#ffffff` | `#0f1115` | error 之上文字 |
| `info` (DEFAULT) | `#0284c7` | `#38bdf8` | `processing` 中间态、常规提示 |
| `info-subtle` | `#f0f9ff` | `#0f2836` | 信息浅底 |
| `info-foreground` | `#ffffff` | `#0f1115` | info 之上文字 |

> 状态徽标 `StatusBadge` 建议：`pending`→warning-subtle 底 + warning 文字；`processing`→info；`ready`→success；`failed`→error（并展示 `error_reason`）。语义色与靛蓝主色分处不同色相段（绿/橙/红/青 vs 蓝紫），并列出现不打架。

### 已校验的关键对比度（WCAG AA 阈值 4.5:1）

| 组合 | Light | Dark |
|------|-------|------|
| 正文 on 页面背景 | 9.7:1 | 11.8:1 |
| 正文 on 卡片表面 | 10.4:1 | 10.9:1 |
| 次级文字 on 卡片表面 | 4.8:1 | 6.3:1 |
| 白字 on 主色按钮 | 6.3:1 | 5.1:1 |
| primary 作文本 on 表面 | 6.3:1 | 5.4:1 |
| success/warning/error 作文本 on 表面 | ≥4.8:1 | ≥5.8:1 |

---

## 2. 间距 token

基础单位 **4px**。高密度界面下 `xs`/`sm` 承担列表行内间距，`md` 为组件默认内边距，`lg`/`xl` 用于区块与页面级留白。

| Token | 值 | 倍数 | 用途 |
|-------|-----|------|------|
| `xs` | `4px` | 1× | 图标与文字间距、标签内边距 |
| `sm` | `8px` | 2× | 列表行内元素间距、紧凑表单 |
| `md` | `16px` | 4× | 组件默认内边距、卡片内间距 |
| `lg` | `24px` | 6× | 区块之间、卡片外间距 |
| `xl` | `32px` | 8× | 页面级分区留白 |

Tailwind 用法：`p-md` `gap-sm` `mt-lg` 等。

---

## 3. 字体 token

### 字体族 fontFamily

| Token | 值 | 用途 |
|-------|-----|------|
| `font-sans` | `-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif` | 界面主字体，中英文兼顾，优先系统字体避免加载抖动 |
| `font-mono` | `SFMono-Regular, Menlo, Consolas, monospace` | 代码片段、SSE 原始事件、错误码展示 |

### 字号档位 fontSize（含默认行高）

| Token | 字号 | 行高 | 用途 |
|-------|------|------|------|
| `text-xs` | `12px` | `16px` | 辅助信息：时间、状态徽标、脚注 |
| `text-sm` | `14px` | `20px` | 界面默认正文、列表、表单 |
| `text-md` | `16px` | `24px` | 对话消息正文、强调正文 |
| `text-lg` | `18px` | `28px` | 卡片标题、次级标题 |
| `text-xl` | `24px` | `32px` | 页面标题 |
| `text-2xl` | `30px` | `38px` | 大标题（登录页等空旷场景） |

### 行高

字号档位已内建默认行高（v4 的 `--text-*--line-height`），无需额外指定。需要独立覆盖时直接用 Tailwind 内建的 `leading-tight`（1.25，标题）/ `leading-normal`（1.5，正文）/ `leading-relaxed`（1.75，长对话流）。

---

## 使用约定

- 组件层**只消费 token**，不写裸色值/裸像素——保证后续换主题、调密度时改动集中。
- 颜色走语义 token（`surface`/`foreground`/`border`/`primary`/语义色），**不直接引亮/暗具体色值**；同一份组件代码在亮/暗下自动取对应变量，无需写两套。
- 状态色一律走语义 token，不在业务组件里重新定义 `pending`/`ready` 等的颜色。
- **明暗切换**：在 `<html>` 上加/去 `dark` class。持久化（localStorage / 跟随系统 `prefers-color-scheme`）由上层主题开关组件负责，token 层不关心。
- 单一源：所有 token（颜色亮/暗取值、间距、字体、shadcn 语义名映射）集中在 `src/app/globals.css`，本文档为其说明。改 `globals.css` 后同步本文档；改颜色后重新校验 WCAG AA。
