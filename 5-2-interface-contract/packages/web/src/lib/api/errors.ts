/**
 * API 客户端错误类型(architecture-design.md §四:错误响应统一 { error: { code, message } })。
 *
 * 全系统只有一个具体错误类 {@link ApiError}:把 HTTP 层的一切失败(业务错误、鉴权、网络、
 * 非契约的网关错误)统一归一化成它。**调用层只处理 `code` 字段,不看 HTTP 状态码**——
 * status 只用于拦截器内部分流(如 401 触发跳转),不作为调用方的分支依据。
 *
 * `code` 的取值是服务端契约里的字符串错误码(schema `ApiError.error.code`),
 * 如 VALIDATION_ERROR / UNAUTHORIZED / LLM_TIMEOUT。schema 里是开放字符串而非闭合枚举,
 * 故这里也用 string,不硬造一份会与后端漂移的联合类型。
 */

import type { ApiErrorResponse } from "@kb/shared";

/**
 * 服务端错误响应体契约,取自单一事实源(schema.yaml → @kb/shared)。
 * 形如 `{ error: { code, message, details? } }`。
 */
export type ErrorEnvelope = ApiErrorResponse;

/** 拦截器内部无 HTTP 响应时用的兜底错误码(网络层失败、请求处理异常)。 */
export const NETWORK_ERROR_CODE = "NETWORK_ERROR";

/** 运行时判定一个未知值是否符合 { error: { code, message } } 契约。 */
export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const inner = (value as { error?: unknown }).error;
  if (typeof inner !== "object" || inner === null) return false;
  const { code, message } = inner as { code?: unknown; message?: unknown };
  return typeof code === "string" && typeof message === "string";
}

/** 构造 ApiError 的入参。statusCode 供拦截器内部分流,不暴露给调用方作分支依据。 */
export interface ApiErrorInit {
  code: string;
  message: string;
  /** HTTP 状态码;网络层失败(无响应)时为 undefined。 */
  statusCode?: number;
  /** 服务端返回的结构化补充(如逐字段校验错误)。 */
  details?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * 统一的 API 错误。调用层通过 `error.code` 分支处理,不碰 statusCode。
 * 用 `isApiError(err)` 收窄,而不是 `instanceof`——跨包/跨打包边界 instanceof 可能失效。
 */
export class ApiError extends Error {
  /** 机器可判读的错误码(服务端契约)。调用层唯一应依赖的分支字段。 */
  readonly code: string;
  /** HTTP 状态码;网络层失败时 undefined。仅拦截器内部使用,调用层不应依赖。 */
  readonly statusCode?: number;
  /** 可选的结构化补充。 */
  readonly details?: Record<string, unknown>;

  constructor(init: ApiErrorInit) {
    super(init.message, init.cause !== undefined ? { cause: init.cause } : undefined);
    this.name = "ApiError";
    this.code = init.code;
    this.statusCode = init.statusCode;
    this.details = init.details;
  }
}

/**
 * type guard:判断一个未知错误是否为 {@link ApiError}。调用侧据此拿到 `code` 分支处理。
 * 用鸭子判定(name + code)而非 `instanceof`,避免多份 axios/打包实例导致原型链不一致时误判。
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    value instanceof ApiError ||
    (typeof value === "object" &&
      value !== null &&
      (value as { name?: unknown }).name === "ApiError" &&
      typeof (value as { code?: unknown }).code === "string")
  );
}
