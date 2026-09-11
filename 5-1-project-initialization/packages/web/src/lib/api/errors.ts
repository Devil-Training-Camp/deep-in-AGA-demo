/**
 * API 客户端错误类型(architecture-design.md §四:错误响应统一 { error: { code, message } })。
 *
 * 按来源分三类,让调用方能据此分流处理(prompt:区分网络错误 / 业务错误 / 鉴权错误):
 * - NetworkError:请求没拿到 HTTP 响应(断网、超时、DNS 等),或非 2xx 但无法解析出业务错误体
 * - AuthError:鉴权失败(401/403),调用方通常需引导重新登录
 * - BusinessError:服务端按契约返回的 { error: { code, message } } 业务错误
 *
 * 三者都继承 ApiError,调用方可用 `instanceof ApiError` 兜底,或按子类精确分流。
 */

/** 服务端错误响应体契约(architecture-design.md:248)。 */
export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

/** 运行时判定一个未知值是否符合 { error: { code, message } } 契约。 */
export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const inner = (value as { error?: unknown }).error;
  if (typeof inner !== "object" || inner === null) return false;
  const { code, message } = inner as { code?: unknown; message?: unknown };
  return typeof code === "string" && typeof message === "string";
}

/** 所有 API 错误的基类。statusCode 在无 HTTP 响应(网络层失败)时为 undefined。 */
export abstract class ApiError extends Error {
  abstract readonly kind: "network" | "auth" | "business";
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}

/** 网络层失败:没有 HTTP 响应,或响应体不符合业务错误契约。可安全重试(仅限幂等请求)。 */
export class NetworkError extends ApiError {
  readonly kind = "network" as const;

  constructor(message: string, statusCode?: number, options?: { cause?: unknown }) {
    super(message, statusCode, options);
  }
}

/** 鉴权失败(401 / 403)。不重试——重试不会让 token 变有效,只会放大失败。 */
export class AuthError extends ApiError {
  readonly kind = "auth" as const;

  constructor(message: string, statusCode: number, options?: { cause?: unknown }) {
    super(message, statusCode, options);
  }
}

/** 业务错误:服务端按契约返回的 { error: { code, message } }。code 供调用方分支处理。 */
export class BusinessError extends ApiError {
  readonly kind = "business" as const;
  readonly code: string;

  constructor(code: string, message: string, statusCode: number, options?: { cause?: unknown }) {
    super(message, statusCode, options);
    this.code = code;
  }
}
