/**
 * auth 模块 mock:注册 / 登录。两者都是 security: [] 的公开入口。
 * 成功返回 {@link AuthResult};`?mock=error` 时演练错误态(register→409 邮箱已注册,login→401 凭证错误)。
 */

import { http, HttpResponse } from "msw";
import { errorResponse, isErrorMode } from "../helpers";
import { mockAuthResult } from "../fixtures";

export const authHandlers = [
  // POST /api/auth/register —— 注册成功 201;错误态给 409 邮箱已被注册
  http.post("/api/auth/register", ({ request }) => {
    if (isErrorMode(request)) {
      return errorResponse(409, "EMAIL_ALREADY_REGISTERED", "该邮箱已被注册。");
    }
    return HttpResponse.json(mockAuthResult, { status: 201 });
  }),

  // POST /api/auth/login —— 登录成功 200;错误态给 401 凭证不正确
  http.post("/api/auth/login", ({ request }) => {
    if (isErrorMode(request)) {
      return errorResponse(401, "INVALID_CREDENTIALS", "邮箱或密码不正确。");
    }
    return HttpResponse.json(mockAuthResult, { status: 200 });
  }),
];
