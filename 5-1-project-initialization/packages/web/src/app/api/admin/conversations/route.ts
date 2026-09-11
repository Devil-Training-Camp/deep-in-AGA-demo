import { NextResponse } from "next/server";

// GET /api/admin/conversations —— 管理员全局只读审计(architecture-design.md §API 5)。
// 校验 role === 'admin'(不得用 role !== 'user' 反向逻辑);刻意不拼 user_id 过滤。
// 唯一必须审计到人的操作:必带 admin_user_id + target_user_id(CLAUDE.md 埋点纪律)。
export function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
