# `conversations/[id]/messages/` — 会话消息列表

`GET /api/conversations/:id/messages`:某次会话的消息。

**必须校验 `:id` 归属当前 user_id,防 IDOR**;分页/游标 + 虚拟滚动。详见父级 `conversations/README.md`。

- `route.ts` — GET Handler。
