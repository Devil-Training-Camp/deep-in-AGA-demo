// 进程内会话内存(CLAUDE.md 模块边界)。session_id 索引最近 N 轮(CONTEXT_WINDOW_ROUNDS)。
// 只服务多轮对话上下文,绝不读 messages 历史表——"历史不作为上下文"靠这条读路径分离实现。
// 空闲 SESSION_TTL_MS 后可回收,靠请求时惰性剔除过期项,不起后台定时器。
export {};
