# `lib/auth/` — Supabase Auth 认证与鉴权

对应 `architecture-design.md` 决策 5(2026-09-09 由自建 JWT 变更为 Supabase Auth)、决策 8、CLAUDE.md 模块边界 `lib/auth`。

## 放什么

- `supabase-server.ts` — 服务端 Supabase 客户端工厂 + session 读取:
  - `createSupabaseServerClient()` — 基于请求 cookie 的服务端客户端。
  - `getCurrentUser()` — 读当前登录用户,**未登录返回 `null`,不抛错**。
  - `getCurrentUserWithRole()` — 在此基础上用 `user.id` 查 `users` 表补齐 `role`。
- `require-auth.ts` — Route Handler 守卫:`requireUser()` / `requireAdmin()`,返回用户或统一的 `{ error: { code, message } }` Response。
- `index.ts` — 对外导出。
- (中间件在 `src/middleware.ts`,负责每请求刷新 session + 受保护路径粗粒度门禁。)

## 红线

- **授权决策走 `auth.getUser()`,不用 `getSession()`**——前者向 Auth 服务端校验 token,后者只信任 cookie。
- **`role` 服务端受控**:从 `users` 表查得,不信任客户端传入的角色,不直接采信 JWT claim。
- admin 判定用 `role === 'admin'`,**不得用 `role !== 'user'` 反向逻辑**(未知角色会被误放行)。
- **`SUPABASE_PUBLISHABLE_KEY`** 是客户端可见的 anon key,可进 env;**`service_role key` 属机密,只存服务端 env、绝不进 bundle**、不出现在本层。
- 密码找回、邮件模板等交由 Supabase 托管,本层不落地密码哈希。

## 健康检查

`pnpm --filter @kb/web auth:healthcheck` 验证客户端能初始化、且未登录状态下 `getUser()` 返回 `null` 而非报错。需先在 env 配好 `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`。

## 需在 Supabase 控制台开启的 Auth Provider

本期**只开 Email**(Authentication → Providers → Email:邮箱+密码)。第三方 Provider(Google / GitHub / …)未纳入需求,**一律保持关闭**——放开会绕过公司邮箱域名的注册约束。注册开放度(限公司邮箱域名 / 关闭公开注册改邀请制)在控制台的 Auth 配置里约束(见 `architecture-design.md` 待确认项)。
