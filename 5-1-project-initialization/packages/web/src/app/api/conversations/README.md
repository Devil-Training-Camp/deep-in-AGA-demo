# `app/api/conversations/` — 用户历史(私有)

对应 `architecture-design.md` §API 5、决策 7:普通用户只看自己的对话历史。

## 端点

- `GET /api/conversations` — 仅返回当前 `user_id` 的会话(`route.ts`)
- `GET /api/conversations/:id/messages` — 某次会话的消息列表(`[id]/messages/route.ts`)

## 红线

- **历史强制拼 `user_id`**——三条相反授权规则之一。过滤在 `lib/db` 数据访问层统一注入 `WHERE user_id = :currentUser`,防漏加导致越权(CLAUDE.md P0)。
- `:id/messages` 必须校验 `:id` 归属当前用户,防 IDOR。
- `messages` 为 append-only,不物理删除(审计要求)。
- 大数据量:分页/游标 + 长列表虚拟滚动(nonfunctional-requirements.md)。
