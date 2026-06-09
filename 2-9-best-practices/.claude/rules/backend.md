# 后端 API 规范

## 路由
- REST 风格，资源名用复数（`/users`，不是 `/user`）
- 路径参数用 kebab-case（`/user-profiles`）

## 接口定义
- 请求和响应必须有 Zod schema，schema 放 `src/schemas/` 目录
- 不用自然语言描述接口，用类型定义

示例：
```typescript
import { z } from 'zod';

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});
```

## 错误处理
- 业务错误用 4xx，服务端错误用 5xx
- 错误响应统一格式：`{ code: string, message: string }`

## 认证
- JWT，有效期 2 小时
- refresh token 有效期 30 天，存 httpOnly cookie
