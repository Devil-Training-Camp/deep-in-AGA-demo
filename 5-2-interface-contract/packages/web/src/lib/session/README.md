# `lib/session/` — 进程内会话内存

对应 `architecture-design.md:407`(决策 4)、CLAUDE.md 模块边界 `lib/session`。

单实例长驻 Node 进程下,`session_id` 索引一个进程内 Map,存最近 N 轮对话上下文。

## 放什么

- `index.ts` — 会话窗口读写 + 过期清理的实现。
- 按 `session_id` 存最近 `CONTEXT_WINDOW_ROUNDS`(默认 6)轮。

## 红线

- **只服务多轮对话上下文,绝不读 `messages` 历史表**——「历史不作为上下文」靠这条读路径分离实现,不靠表字段。
- 空闲 `SESSION_TTL_MS`(默认 30 分钟)后可回收;本期靠请求时惰性剔除过期项,**不起后台定时器**。
- 进程重启丢进行中上下文——与需求「刷新即清」语义一致,非隐患。
