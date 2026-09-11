import { NextResponse } from "next/server";

// 单份文档:状态查询 / 删除(architecture-design.md §API 3)。
// GET    —— 前端轮询 { status, error_reason? };failed 时回显具体原因。
// DELETE —— 删文档及其 chunk(ON DELETE CASCADE);破坏性操作须记录操作者/时间/级联影响量。
export function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}

export function DELETE() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
