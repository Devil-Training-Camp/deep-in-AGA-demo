# `app/api/admin/` — 管理员审计(全局只读)

对应 `architecture-design.md` §API 5、决策 8:管理员唯一特权是一条独立只读路径,查看所有 `user_id` 的问答记录。除此之外与普通用户能力一致。

## 端点

- `GET /api/admin/conversations` — 全局只读,**刻意不拼 `user_id` 过滤**(`conversations/route.ts`)

## 红线

- **校验 `role === 'admin'`,不得用 `role !== 'user'` 这类反向逻辑**(CLAUDE.md P0)。
- **此路径刻意不拼 `user_id` 过滤**——三条相反授权规则之一。
- 全系统唯一必须审计到人的操作:每次查看必带 `admin_user_id` + `target_user_id`(埋点纪律)。
- 大数据量:分页/游标 + 虚拟滚动。
