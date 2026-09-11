# `@kb/shared` — 共享类型与工具

被 `@kb/web` 和 `@kb/db` 引用的单一事实源:领域类型、SSE 事件契约、通用工具。纯 TS 库,无运行时副作用,不依赖任何厂商 SDK。

## 目录

| 目录 | 内容 |
|------|------|
| `src/types/` | 领域类型与接口契约 |
| `src/utils/` | 无副作用的通用工具函数 |

类型全部来自 `architecture-design.md` 的 DDL(§三)与 API 契约(§四),以及 CLAUDE.md 的行为约束。改这里等于改契约,web/db 两侧同步受影响。
