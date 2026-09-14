/**
 * MSW handler 的公共工具:错误模式切换 + 契约化的错误响应构造。
 *
 * 开发时通过 `?mock=error` 让任一接口切到错误分支,方便本地演练加载失败、
 * 空态与错误态的 UI。响应体一律走 schema 生成的类型({@link ApiError} 等),
 * 不返回裸对象,保证 mock 与真实契约同构。
 */

import { HttpResponse } from "msw";
import type { ApiError } from "@/lib/api/generated/api.schemas";

/** 触发错误分支的 query 约定:任一接口带 `?mock=error` 即返回其错误 handler。 */
export const MOCK_ERROR_FLAG = "mock";
export const MOCK_ERROR_VALUE = "error";

/** 判断本次请求是否要走错误分支(URL 带 `?mock=error`)。 */
export function isErrorMode(request: Request): boolean {
  return new URL(request.url).searchParams.get(MOCK_ERROR_FLAG) === MOCK_ERROR_VALUE;
}

/**
 * 构造一个符合 `ApiError` 契约的错误响应。
 * code 是机器可判读错误码(调用层据此分支,见 lib/api/errors.ts),message 面向开发者,
 * 绝不含敏感字段(password_hash / 密钥 / messages.content)。
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  const body: ApiError = {
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return HttpResponse.json(body, { status });
}

/** 401 未登录 —— 各接口共用,对齐 schema `#/components/responses/Unauthorized`。 */
export const unauthorized = () =>
  errorResponse(401, "UNAUTHORIZED", "未登录或登录态失效,请重新登录。");

/** 403 已登录但无权 —— 对齐 `#/components/responses/Forbidden`。 */
export const forbidden = (message = "已登录但无权访问该资源。") =>
  errorResponse(403, "FORBIDDEN", message);

/** 404 资源不存在 —— 对齐 `#/components/responses/NotFound`。 */
export const notFound = (message = "资源不存在。") =>
  errorResponse(404, "NOT_FOUND", message);

/** 400 参数不合法 —— 对齐 `#/components/responses/BadRequest`。 */
export const badRequest = (
  message = "请求参数不合法。",
  details?: Record<string, unknown>,
) => errorResponse(400, "VALIDATION_ERROR", message, details);

/** 429 触发限流 —— 认证入口按 IP/账号限失败次数。 */
export const rateLimited = () =>
  errorResponse(429, "RATE_LIMITED", "操作过于频繁,请稍后再试。");
