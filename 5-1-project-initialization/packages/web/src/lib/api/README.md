# `lib/api/` — 前端 API 客户端基础层

基于 axios 的统一请求层,供前端页面调用后端 JSON 接口。封装鉴权头注入、错误归一化、幂等重试三件事(architecture-design.md §四)。

## 放什么

- `client.ts` — `createApiClient(options)`:带请求/响应拦截器的 axios 实例。
- `errors.ts` — 错误类型:`ApiError` 基类 + `NetworkError` / `AuthError` / `BusinessError`。
- `index.ts` — 对外导出。
- `__tests__/` — Vitest 单元测试(用自定义 adapter,不发真实网络)。

## 设计要点(严格对齐文档,未引入文档外约定)

- **鉴权头**:请求拦截器注入 `Authorization: Bearer <token>`(`:248`)。token 由 `getToken()` 惰性提供,绝不硬编码、绝不进 bundle 常量。
- **错误分三类**:`AuthError`(401/403)、`BusinessError`(服务端 `{ error: { code, message } }` 契约,`:248`)、`NetworkError`(无响应,或非契约的 5xx)。调用方可 `instanceof ApiError` 兜底或按 `kind` 分流。
- **retry 保守**:文档没有 retry 约定,故只重试**幂等 GET/HEAD/OPTIONS**、且仅在网络错误或 5xx 时,指数退避。**POST/DELETE 一律不重试**——`POST /api/chat` 按 token 计费、上传会重复入库,盲目重试有害。

## 边界

**不覆盖 `/api/chat`(SSE)**。文档的问答路径是 `text/event-stream` + `fetch`/`AbortController`(`:276`、`:301`),且流内错误走 `event: error` 不依赖 HTTP 状态码(`:299`)——axios 不适合 token 流式,也套不上这里的错误归一化。SSE 客户端是独立的一层,后续单独实现。
