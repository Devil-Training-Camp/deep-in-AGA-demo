import { NextResponse } from "next/server";

// 知识库 CRUD + 文档上传(architecture-design.md §API)。
// 知识库全员共享、无 owner 字段,检索只在单库内不跨库(CLAUDE.md 数据边界)。
// 上传全异步入库:立即返回 { documentId, status: "pending" },解析/embedding 丢后台。
export function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
