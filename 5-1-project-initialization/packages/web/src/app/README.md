# `app/` — 前端页面 + API Routes

Next.js App Router 根目录。同时承载前端页面(`layout.tsx`/`page.tsx` 及后续路由段)与后端接口(`api/`)。

## 放什么

- `layout.tsx` — 根布局。
- `page.tsx` — 首页。
- 后续前端路由段(登录、知识库、问答、历史、管理后台等),按 App Router 约定用目录 + `page.tsx`。
- `api/` — 全部后端 Route Handler,见 `api/README.md`。

## 前端相关红线(nonfunctional-requirements.md)

- 问答页答案区只向下追加、CLS ≤ 0.1;「中断」按钮点击响应 ≤ 200ms。
- 历史详情、管理后台等大数据量列表须分页/游标 + 长列表虚拟滚动。
- 任何密钥/连接串不得出现在前端代码(禁 `NEXT_PUBLIC_` 前缀承载敏感值)。
