/**
 * documents 模块 mock:库内文档列表 / 上传(全异步) / 轮询单份 / 删除。
 * 上传立即返回 { documentId, status: "pending" },真实入库走后台——mock 只回即时态。
 * `?mock=error` 时:list→404 库不存在,upload→415 不支持的格式,get→404,delete→404。
 */

import { http, HttpResponse } from "msw";
import { errorResponse, isErrorMode, notFound } from "../helpers";
import { mockDocument, mockDocuments, mockUploadResult } from "../fixtures";

export const documentHandlers = [
  // GET /api/knowledge-bases/:id/documents —— 库内文档及状态列表
  http.get("/api/knowledge-bases/:id/documents", ({ request }) => {
    if (isErrorMode(request)) return notFound("知识库不存在。");
    return HttpResponse.json(mockDocuments, { status: 200 });
  }),

  // POST /api/knowledge-bases/:id/documents —— 已接收 202,后台入库中
  http.post("/api/knowledge-bases/:id/documents", ({ request }) => {
    if (isErrorMode(request)) {
      return errorResponse(415, "UNSUPPORTED_FORMAT", "不支持的文件格式,仅支持 pdf/docx/txt。");
    }
    return HttpResponse.json(mockUploadResult, { status: 202 });
  }),

  // GET /api/documents/:id —— 轮询单份文档状态
  http.get("/api/documents/:id", ({ request }) => {
    if (isErrorMode(request)) return notFound("文档不存在。");
    return HttpResponse.json(mockDocument, { status: 200 });
  }),

  // DELETE /api/documents/:id —— 删除成功 204,无响应体
  http.delete("/api/documents/:id", ({ request }) => {
    if (isErrorMode(request)) return notFound("文档不存在。");
    return new HttpResponse(null, { status: 204 });
  }),
];
