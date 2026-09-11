# `app/api/auth/` — 认证入口

对应 `architecture-design.md` §API 1、决策 5:邮箱+密码自建账号,登录态用无状态 JWT。

## 端点

- `POST /api/auth/register` — `{ email, password }` → `{ token }`
- `POST /api/auth/login` — `{ email, password }` → `{ token }`

## 放什么

- `route.ts` — 注册/登录 Handler。
- 密码哈希、JWT 签发的实现委托给 `lib/auth`,此处只做入参校验与限流。

## 红线

- **唯二无鉴权入口,必须限流**:`login` 按 IP/账号限失败次数;`register` 按拍板的开放度约束,不得默认任意邮箱可注册(CLAUDE.md P0)。
- `role`(`user`/`admin`)放进 JWT claim;首个管理员靠 seed/环境变量指定,不经注册流程产生。
- 响应/日志绝不含 `password_hash`;需要邮箱时降级为 `email_domain`。
