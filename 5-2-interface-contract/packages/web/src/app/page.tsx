import { PARAMS } from "@/config/params";
import { Button } from "@/components/ui/button";

/**
 * 骨架首页:确认 monorepo、Next 应用与 shadcn/ui + Tailwind 渲染链路可跑通。
 * 业务 UI(知识库列表、问答页、历史等)在后续章节实现。
 */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">智能知识问答系统</h1>
      <p className="mt-2 text-muted-foreground">
        项目骨架已就绪。以下路由与模块在后续章节逐步落地:
      </p>
      <ul className="mt-4 space-y-1 text-sm">
        <li>
          <code>/api/auth</code> — 注册 / 登录(Supabase Auth,邮箱+密码)
        </li>
        <li>
          <code>/api/knowledge-bases</code> — 知识库 CRUD + 文档上传
        </li>
        <li>
          <code>/api/documents</code> — 文档状态 / 删除
        </li>
        <li>
          <code>/api/chat</code> — SSE 流式问答
        </li>
        <li>
          <code>/api/conversations</code> — 用户历史
        </li>
        <li>
          <code>/api/admin</code> — 管理员审计只读路径
        </li>
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        检索命中阈值{" "}
        <code>GROUNDED_SIMILARITY_THRESHOLD = {PARAMS.GROUNDED_SIMILARITY_THRESHOLD}</code>
        ,可调参数集中在 <code>src/config/params.ts</code>。
      </p>
      <div className="mt-6 flex gap-3">
        <Button>主按钮</Button>
        <Button variant="outline">次按钮</Button>
      </div>
    </main>
  );
}
