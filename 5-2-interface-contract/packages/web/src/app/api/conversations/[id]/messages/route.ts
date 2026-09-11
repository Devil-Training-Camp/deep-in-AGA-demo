import { NextResponse } from "next/server";

// GET /api/conversations/:id/messages —— 某次会话的消息列表(architecture-design.md §API 5)。
// 必须校验 :id 归属当前 user_id,防 IDOR(CLAUDE.md P0)。
// messages 为 append-only;大数据量须分页/游标 + 长列表虚拟滚动(nonfunctional-requirements.md)。
export function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
