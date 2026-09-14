/**
 * conversations 模块 mock:当前用户会话列表 / 某会话内消息。
 * 历史按 user_id 私有,真实实现强制拼 WHERE user_id;mock 直接回当前用户数据。
 * `?mock=error` 时:list→401 未登录,messages→403 会话不归属当前用户(IDOR 防护演练)。
 */

import { http, HttpResponse } from "msw";
import { forbidden, isErrorMode, unauthorized } from "../helpers";
import { mockConversationPage, mockMessagePage } from "../fixtures";

export const conversationHandlers = [
  // GET /api/conversations —— 当前用户会话分页
  http.get("/api/conversations", ({ request }) => {
    if (isErrorMode(request)) return unauthorized();
    return HttpResponse.json(mockConversationPage, { status: 200 });
  }),

  // GET /api/conversations/:id/messages —— 会话内消息分页(须校验归属,防 IDOR)
  http.get("/api/conversations/:id/messages", ({ request }) => {
    if (isErrorMode(request)) return forbidden("该会话不归属当前用户。");
    return HttpResponse.json(mockMessagePage, { status: 200 });
  }),
];
