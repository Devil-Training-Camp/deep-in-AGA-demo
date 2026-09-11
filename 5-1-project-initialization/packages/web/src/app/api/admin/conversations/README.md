# `admin/conversations/` — 管理员全局审计

`GET /api/admin/conversations`:全局只读,查看所有 `user_id` 的问答记录。

**校验 `role === 'admin'`(不用反向逻辑);刻意不拼 user_id 过滤;必审计到人(admin_user_id + target_user_id)**。详见父级 `admin/README.md`。

- `route.ts` — GET Handler。
