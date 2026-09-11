import { NextResponse } from "next/server";

// DELETE /api/knowledge-bases/:id —— 删除知识库(architecture-design.md §API 2)。
// 级联删 documents 与 doc_chunks(ON DELETE CASCADE)。
// 全员平权:此路径刻意不拼 user 过滤(CLAUDE.md 三条相反授权规则之一)。
// 破坏性操作:服务端须记录操作者、时间、级联影响量(前端二次确认不构成后端防护)。
export function DELETE() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
