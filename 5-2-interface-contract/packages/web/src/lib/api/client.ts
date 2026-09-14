import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { ApiError, NETWORK_ERROR_CODE, isErrorEnvelope } from "./errors.js";

/**
 * axios 基础层:统一注入鉴权头、把一切失败归一化为单一的 {@link ApiError}、
 * 对幂等请求做有限重试(architecture-design.md §四)。
 *
 * 归一化原则:调用层只处理 `ApiError.code`,不看 HTTP 状态码;状态码只在本层内部
 * 用于分流(401 触发跳转登录、5xx 决定是否重试)。401 在拦截器里统一 redirect,
 * 不把鉴权失败透传给调用层去各自处理。
 *
 * 边界:本层只覆盖 JSON 接口(auth/knowledge-bases/documents/conversations/admin)。
 * SSE 的 /api/chat 走 fetch + AbortController 的独立流式客户端,不归 axios——axios 的
 * XHR/http adapter 不适合 token 流式,且文档的流内 event:error 契约与 HTTP 状态码解耦
 * (architecture-design.md:299、301),不能套用这里的错误归一化。
 */

/** 重试仅针对幂等方法。POST/DELETE 非幂等:chat 按 token 计费、上传会重复入库,盲目重试有害。 */
const IDEMPOTENT_METHODS = new Set(["get", "head", "options"]);

export interface ApiClientOptions {
  baseURL?: string;
  /** 取当前 JWT;返回 undefined 表示未登录,不注入 Authorization。绝不硬编码 token。 */
  getToken?: () => string | undefined;
  timeoutMs?: number;
  /** 幂等请求的最大重试次数(不含首次)。默认 2。 */
  maxRetries?: number;
  /** 重试基础退避毫秒,第 n 次退避 = baseDelayMs * 2^(n-1)。默认 300。 */
  baseDelayMs?: number;
  /**
   * 401 后跳转的登录路径。默认 "/login"。
   * 仅在浏览器环境(有 window)生效;SSR 下不跳转。
   */
  loginPath?: string;
  /**
   * 401 时的自定义处理。提供则由它决定如何跳转(如 Next router.push),
   * 拦截器不再自行 window.location 跳转。默认未提供时走浏览器 window.location.assign(loginPath)。
   */
  onUnauthorized?: () => void;
  /**
   * 覆盖 axios 底层 adapter。生产环境无需设置(走默认 XHR/http adapter);
   * 仅测试注入可编程 adapter 以拦截请求、断言重试与归一化,不发真实网络。
   */
  adapter?: AxiosAdapter;
}

// 每个请求配置上挂一个已重试计数,交给拦截器读写。
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 只有网络层失败或 5xx 才对幂等请求重试;4xx(含鉴权、业务)一律不重试。 */
function shouldRetry(error: AxiosError, config: RetryableConfig, maxRetries: number): boolean {
  const method = config.method?.toLowerCase();
  if (!method || !IDEMPOTENT_METHODS.has(method)) return false;
  if ((config._retryCount ?? 0) >= maxRetries) return false;

  const status = error.response?.status;
  if (status === undefined) return true; // 无响应 = 网络层失败,可重试
  return status >= 500 && status <= 599; // 仅 5xx;4xx 是客户端问题,重试无意义
}

/**
 * 把 axios 的失败归一化为单一 {@link ApiError}。
 * - 有契约错误体({ error: { code, message } }):直接采用服务端的 code/message/details。
 * - 无响应(断网/超时/DNS):code = NETWORK_ERROR。
 * - 有响应但错误体不符契约(如网关 5xx 的 HTML):同样归 NETWORK_ERROR,带上 statusCode。
 */
function normalizeError(error: AxiosError): ApiError {
  const status = error.response?.status;
  const data = error.response?.data;

  if (isErrorEnvelope(data)) {
    return new ApiError({
      code: data.error.code,
      message: data.error.message,
      statusCode: status,
      details: data.error.details,
      cause: error,
    });
  }

  // 没有 HTTP 响应,或响应体不符合契约:统一当网络层错误,code 兜底。
  const message =
    status === undefined
      ? error.message || "网络请求失败,未收到响应。"
      : error.message || `请求失败,HTTP ${String(status)}。`;
  return new ApiError({
    code: NETWORK_ERROR_CODE,
    message,
    statusCode: status,
    cause: error,
  });
}

export function createApiClient(options: ApiClientOptions = {}): AxiosInstance {
  const {
    baseURL = "/api",
    getToken,
    timeoutMs = 10_000,
    maxRetries = 2,
    baseDelayMs = 300,
    loginPath = "/login",
    onUnauthorized,
    adapter,
  } = options;

  const instance = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: { "Content-Type": "application/json" },
    ...(adapter ? { adapter } : {}),
  });

  // 请求拦截器:注入 Authorization: Bearer <token>(architecture-design.md:248)。
  // token 由 getToken 惰性提供,绝不硬编码、绝不进前端 bundle 常量。
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken?.();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  // 响应拦截器:幂等请求按退避重试;401 统一跳转登录;最终失败归一化为 ApiError。
  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        // 非 axios 抛出的异常(拦截器 bug 等),包成 ApiError,不吞。
        throw new ApiError({
          code: NETWORK_ERROR_CODE,
          message: "请求处理异常。",
          cause: error,
        });
      }

      const config = error.config as RetryableConfig | undefined;
      if (config && shouldRetry(error, config, maxRetries)) {
        config._retryCount = (config._retryCount ?? 0) + 1;
        await delay(baseDelayMs * 2 ** (config._retryCount - 1));
        return instance.request(config);
      }

      // 401:鉴权失效,拦截器统一跳转登录,不透传给调用层各自处理。
      // 仅浏览器环境跳转(SSR 无 window);有自定义 onUnauthorized 则交给它。
      if (error.response?.status === 401) {
        if (onUnauthorized) {
          onUnauthorized();
        } else if (typeof window !== "undefined") {
          window.location.assign(loginPath);
        }
      }

      throw normalizeError(error);
    },
  );

  return instance;
}

export type { AxiosInstance, AxiosRequestConfig };
