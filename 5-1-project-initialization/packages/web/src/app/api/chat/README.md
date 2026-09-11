# `app/api/chat/` — SSE 流式问答

对应 `architecture-design.md` §API 4、决策 1、时序图 2。全系统唯一的流式接口。

## 端点

- `POST /api/chat` — 请求体 `{ knowledgeBaseId, sessionId, question }`,响应 `Content-Type: text/event-stream`。

## 运行时硬约束(已写进 `route.ts`)

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

必须跑在长驻 Node 进程(非 Edge/serverless),且禁止被静态化或缓存(CLAUDE.md 一、技术栈约束)。

## SSE 事件契约

- `event: meta` `{ grounded }` — 命中/未命中按 `GROUNDED_SIMILARITY_THRESHOLD` 区分。
- `event: token` `{ text }` — 逐 token 流出。
- `event: done` `{ conversationId }`。
- `event: error` `{ code, message }` — 首字节发出后(HTTP 200)的错误只能走流内传递,不依赖 HTTP 状态码。

## 红线

- 握手验证 JWT;`sessionId` 必须校验归属当前 `user_id`,禁读他人上下文。
- 中断止损:前端 `AbortController.abort()` → 后端 `request.signal` → 透传取消上游 LLM `fetch`,停止计费。中断响应 ≤ 200ms。
- 残答(中断产生的半截回答)**不写 `messages`**;仅完整回答 append 一条 assistant message。`grounded: false` 的常识推测答案算一次正常作答、照常落库。
- 首 token ≤ 3s(p95,用 TTFT 度量)。
- 会话上下文取自 `lib/session` 进程内内存,绝不读 `messages` 历史表。
