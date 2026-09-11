# `packages/web` — @kb/web

主发布应用:Next.js 16 App Router + React 19 + TypeScript。承载前端页面与后端 API Routes,跑在单个长驻 Node 进程(`next start`,非 serverless)。

源码在 `src/`(见 `src/README.md`),严格对齐 `architecture-design.md:388` 的 `app/lib/config` 三分结构。依赖 `@kb/shared`(类型)与 `@kb/db`(数据访问),经 `next.config.ts` 的 `transpilePackages` 编译。
