import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { AuthError, BusinessError, NetworkError, isErrorEnvelope } from "./errors.js";

/**
 * axios 基础层:统一注入鉴权头、把失败归一化为 NetworkError/AuthError/BusinessError、
 * 对幂等请求做有限重试(architecture-design.md §四)。
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

/** 把 axios 的失败归一化为三类 ApiError。 */
function normalizeError(error: AxiosError): NetworkError | AuthError | BusinessError {
  const status = error.response?.status;

  // 没有 HTTP 响应:断网、超时、DNS 等,归网络错误。
  if (status === undefined) {
    return new NetworkError(error.message || "网络请求失败,未收到响应。", undefined, {
      cause: error,
    });
  }

  // 鉴权失败单独成类,便于调用方引导重新登录。
  if (status === 401 || status === 403) {
    const message = isErrorEnvelope(error.response?.data)
      ? error.response.data.error.message
      : "鉴权失败,请重新登录。";
    return new AuthError(message, status, { cause: error });
  }

  // 服务端按契约返回 { error: { code, message } }:业务错误。
  if (isErrorEnvelope(error.response?.data)) {
    const { code, message } = error.response.data.error;
    return new BusinessError(code, message, status, { cause: error });
  }

  // 非 2xx 但响应体不符合契约(如网关 5xx 的 HTML):当网络层错误处理。
  return new NetworkError(
    error.message || `请求失败,HTTP ${String(status)}。`,
    status,
    { cause: error },
  );
}

export function createApiClient(options: ApiClientOptions = {}): AxiosInstance {
  const {
    baseURL = "/api",
    getToken,
    timeoutMs = 10_000,
    maxRetries = 2,
    baseDelayMs = 300,
  } = options;

  const instance = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: { "Content-Type": "application/json" },
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

  // 响应拦截器:幂等请求按退避重试,最终失败归一化为 ApiError。
  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        // 非 axios 抛出的异常(拦截器 bug 等),包成网络错误,不吞。
        throw new NetworkError("请求处理异常。", undefined, { cause: error });
      }

      const config = error.config as RetryableConfig | undefined;
      if (config && shouldRetry(error, config, maxRetries)) {
        config._retryCount = (config._retryCount ?? 0) + 1;
        await delay(baseDelayMs * 2 ** (config._retryCount - 1));
        return instance.request(config);
      }

      throw normalizeError(error);
    },
  );

  return instance;
}

export type { AxiosInstance, AxiosRequestConfig };
