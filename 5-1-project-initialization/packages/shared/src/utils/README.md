# `src/utils/` — 通用工具函数

`@kb/shared` 的无副作用工具,web/db 共享。

## 放什么

- `email.ts` — `emailDomain(email)`:日志/埋点需要邮箱时降级为域名,满足 CLAUDE.md「日志需要邮箱时降级为 `email_domain`」的脱敏红线。
- 后续:其它纯函数工具(格式化、校验等)。

只放纯函数,不依赖运行时环境、不含 I/O、不引厂商 SDK。涉及密钥/PII 的处理要遵守 CLAUDE.md 脱敏规范。
