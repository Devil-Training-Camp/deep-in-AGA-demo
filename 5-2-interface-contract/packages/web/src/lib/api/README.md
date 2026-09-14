# `lib/api/` — 前端 API 客户端基础层

基于 axios 的统一请求层,供前端页面调用后端 JSON 接口。封装鉴权头注入、错误归一化、幂等重试三件事(architecture-design.md §四)。

## 放什么

- `client.ts` — `createApiClient(options)`:带请求/响应拦截器的 axios 实例。
- `errors.ts` — 错误类型:`ApiError` 基类 + `NetworkError` / `AuthError` / `BusinessError`。
- `mutator.ts` — orval 的自定义 mutator:`customInstance`。生成的请求函数经它复用上面那份 axios 实例,不另起裸 axios,鉴权/重试/错误归一化全部继承。
- `generated/` — **由 `../../../../shared/src/api/schema.yaml` 经 orval 生成**(`pnpm --filter @kb/web gen:api`),按 tag 分目录的请求函数(auth/knowledge-bases/documents/conversations/admin)。**不要手改**;改契约要回 schema.yaml 再重跑。
- `index.ts` — 对外导出。
- `__tests__/` — Vitest 单元测试(用自定义 adapter,不发真实网络)。

## 生成层(orval)

请求函数由 `orval.config.ts` 从 OpenAPI schema 生成,与手写的基础层职责分离:`client.ts` 管「怎么发」,`generated/` 管「调哪个、传什么类型」。三条约定:

- **走 mutator**:`httpClient: axios` + `override.mutator` 指向 `mutator.ts` 的 `customInstance`,生成函数因此复用同一实例、同一套拦截器,不重复实现鉴权与错误归一化。
- **排除 `POST /api/chat`**:配置按 `tags: [chat]` 排除,SseEvent 等 schema 也不生成——SSE 走独立流式客户端(见下「边界」),其类型的单一事实源是 `@kb/shared` 的 `streaming.ts`。
- **baseURL 从环境变量读**:`mutator.ts` 取 `NEXT_PUBLIC_API_BASE_URL`(API 前缀非机密,可暴露给浏览器),缺省回落基础层默认的 `/api`。密钥类值绝不走 `NEXT_PUBLIC_`。

## 设计要点(严格对齐文档,未引入文档外约定)

- **鉴权头**:请求拦截器注入 `Authorization: Bearer <token>`(`:248`)。token 由 `getToken()` 惰性提供,绝不硬编码、绝不进 bundle 常量。
- **错误分三类**:`AuthError`(401/403)、`BusinessError`(服务端 `{ error: { code, message } }` 契约,`:248`)、`NetworkError`(无响应,或非契约的 5xx)。调用方可 `instanceof ApiError` 兜底或按 `kind` 分流。
- **retry 保守**:文档没有 retry 约定,故只重试**幂等 GET/HEAD/OPTIONS**、且仅在网络错误或 5xx 时,指数退避。**POST/DELETE 一律不重试**——`POST /api/chat` 按 token 计费、上传会重复入库,盲目重试有害。

## 边界

**不覆盖 `/api/chat`(SSE)**。文档的问答路径是 `text/event-stream` + `fetch`/`AbortController`(`:276`、`:301`),且流内错误走 `event: error` 不依赖 HTTP 状态码(`:299`)——axios 不适合 token 流式,也套不上这里的错误归一化。SSE 客户端是独立的一层,后续单独实现。
