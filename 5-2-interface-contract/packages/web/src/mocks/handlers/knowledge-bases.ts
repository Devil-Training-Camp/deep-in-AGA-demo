/**
 * knowledge-bases 模块 mock:列表 / 创建 / 删除。
 * 知识库全员平权,mock 不做 user 过滤(对齐数据边界)。
 * `?mock=error` 时:GET→401 未登录,POST→400 参数不合法,DELETE→404 不存在。
 */

import { http, HttpResponse } from "msw";
import { badRequest, isErrorMode, notFound, unauthorized } from "../helpers";
import { mockCreatedKnowledgeBase, mockDeleteKbResult, mockKnowledgeBases } from "../fixtures";

export const knowledgeBaseHandlers = [
  // GET /api/knowledge-bases —— 全量列表(不拼 user 过滤)
  http.get("/api/knowledge-bases", ({ request }) => {
    if (isErrorMode(request)) return unauthorized();
    return HttpResponse.json(mockKnowledgeBases, { status: 200 });
  }),

  // POST /api/knowledge-bases —— 创建成功 201
  http.post("/api/knowledge-bases", ({ request }) => {
    if (isErrorMode(request)) {
      return badRequest("知识库名称不合法(1–100 字符)。", { field: "name" });
    }
    return HttpResponse.json(mockCreatedKnowledgeBase, { status: 201 });
  }),

  // DELETE /api/knowledge-bases/:id —— 删除成功 200,返回级联影响量
  http.delete("/api/knowledge-bases/:id", ({ request }) => {
    if (isErrorMode(request)) return notFound("知识库不存在。");
    return HttpResponse.json(mockDeleteKbResult, { status: 200 });
  }),
];
