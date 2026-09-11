import { NextResponse } from "next/server";

// 库内文档:上传 + 列表(architecture-design.md §API 3)。
// POST —— 上传文件,立即返回 { documentId, status: "pending" },解析/embedding 丢后台。
//   文件字节暂存服务端本地临时目录,pg-boss 载荷只带路径引用,不塞 buffer(CLAUDE.md 暂存约束)。
// GET  —— 列出库内文档及 status(pending/processing/ready/failed)。
export function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}

export function POST() {
  return NextResponse.json({ documentId: null, status: "pending" }, { status: 501 });
}
