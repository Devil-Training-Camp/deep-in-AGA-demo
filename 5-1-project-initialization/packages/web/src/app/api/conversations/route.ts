import { NextResponse } from "next/server";

// 用户历史(architecture-design.md 决策 7)。
// 历史按 user_id 私有:数据访问层强制注入 WHERE user_id = :currentUser;
// /conversations/:id/messages 必须校验 :id 归属当前用户,防 IDOR
// (nonfunctional-requirements.md P0 历史记录强制用户隔离)。
export function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
