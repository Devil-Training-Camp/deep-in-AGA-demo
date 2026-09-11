# `conversations/[id]/` — 单次会话

动态路由段,承载某次会话下的子资源。

- `messages/` — 会话消息列表(`GET /api/conversations/:id/messages`)。

本层无直接端点(无 `route.ts`)——会话本身的列表在父级 `GET /api/conversations`。详见 `conversations/README.md`。
