/**
 * admin 模块 mock:全局只读查看所有用户的问答记录。
 * 真实路径刻意不拼 user_id 过滤、校验 role === 'admin',且是全系统唯一必审计到人的操作。
 * mock 返回跨 user_id 的全局分页;`?mock=error` 时给 403(非 admin 访问)。
 */

import { http, HttpResponse } from "msw";
import { forbidden, isErrorMode } from "../helpers";
import { mockAdminConversationPage } from "../fixtures";

export const adminHandlers = [
  // GET /api/admin/conversations —— 全局会话分页(跨 user_id,仅 admin)
  http.get("/api/admin/conversations", ({ request }) => {
    if (isErrorMode(request)) return forbidden("需要管理员权限。");
    return HttpResponse.json(mockAdminConversationPage, { status: 200 });
  }),
];
