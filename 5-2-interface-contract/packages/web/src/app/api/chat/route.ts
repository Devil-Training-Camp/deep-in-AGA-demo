import { NextResponse } from "next/server";

// SSE 流式问答(architecture-design.md 决策 1)。
//
// 以下两行是 CLAUDE.md 一、技术栈约束的硬要求,先立规矩:
// SSE Route Handler 必须跑在长驻 Node 进程(非 Edge/serverless),且禁止静态化。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 落地时的承重点(留待后续章节):
// - 握手验证 JWT;请求体 sessionId 必须校验归属当前 user_id,禁读他人上下文。
// - 首字节 event: meta {grounded};命中/未命中按 GROUNDED_SIMILARITY_THRESHOLD 区分。
// - 中断止损:前端 AbortController.abort() → request.signal → 透传取消上游 LLM fetch。
// - 残答不写 messages,仅完整回答落库(CLAUDE.md 残答落库语义)。
// - 首字节发出后的错误只能走 event: error 在流内传递,不依赖 HTTP 状态码。
export function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
