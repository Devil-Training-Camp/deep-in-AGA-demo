import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, AxiosResponse } from "axios";
import { AxiosHeaders } from "axios";
import { createApiClient } from "../client.js";
import { ApiError, isApiError, NETWORK_ERROR_CODE } from "../errors.js";

/**
 * 用可编程的自定义 adapter 拦截请求,不发真实网络。
 * 每次调用把请求配置记录进 calls,并按预设脚本返回/抛出,便于断言重试次数与归一化结果。
 */
type Handler = (attempt: number) => Promise<Partial<AxiosResponse>> | Partial<AxiosResponse>;

function makeAdapter(handler: Handler): {
  adapter: AxiosAdapter;
  calls: { method?: string; headers: Record<string, unknown> }[];
} {
  const calls: { method?: string; headers: Record<string, unknown> }[] = [];
  const adapter: AxiosAdapter = (config) => {
    calls.push({
      method: config.method,
      headers: AxiosHeaders.from(config.headers).toJSON(),
    });
    return Promise.resolve()
      .then(() => handler(calls.length))
      .then(
        (res) => {
          const full: AxiosResponse = {
            status: 200,
            statusText: "OK",
            headers: {},
            config,
            data: undefined,
            ...res,
          };
          return full;
        },
        (reason: unknown) => {
          // axios 不会用真实 config 覆盖被拒绝错误自带的 config,而重试逻辑要读 config.method。
          // 这里把真实请求 config 挂回去,模拟真实 adapter 失败时 axios 附带的 config。
          if (reason && typeof reason === "object") {
            (reason as { config?: unknown }).config = config;
          }
          throw reason;
        },
      );
  };
  return { adapter, calls };
}

/** 造一个带 HTTP 响应的 axios 风格失败(response 存在 = 拿到了状态码)。 */
function httpError(status: number, data: unknown): Promise<never> {
  const err = Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, statusText: "", headers: {}, data, config: {} },
    config: {},
    toJSON: () => ({}),
  });
  return Promise.reject(err);
}

/** 造一个无响应的网络层失败(response 缺失)。 */
function networkFailure(): Promise<never> {
  const err = Object.assign(new Error("Network Error"), {
    isAxiosError: true,
    response: undefined,
    config: {},
    toJSON: () => ({}),
  });
  return Promise.reject(err);
}

describe("请求拦截器:注入 Authorization", () => {
  it("有 token 时注入 Bearer 头", async () => {
    const { adapter, calls } = makeAdapter(() => ({ data: { ok: true } }));
    const client = createApiClient({ getToken: () => "tok-123", adapter } as never);
    await client.get("/knowledge-bases");
    expect(calls[0]?.headers.Authorization).toBe("Bearer tok-123");
  });

  it("无 token 时不注入 Authorization 头", async () => {
    const { adapter, calls } = makeAdapter(() => ({ data: { ok: true } }));
    const client = createApiClient({ getToken: () => undefined, adapter } as never);
    await client.get("/knowledge-bases");
    expect(calls[0]?.headers.Authorization).toBeUndefined();
  });
});

describe("响应拦截器:错误归一化为单一 ApiError", () => {
  it("无响应 → ApiError,code=NETWORK_ERROR、无 statusCode", async () => {
    const { adapter } = makeAdapter(() => networkFailure());
    const client = createApiClient({ adapter, maxRetries: 0 } as never);
    await expect(client.get("/x")).rejects.toMatchObject({
      code: NETWORK_ERROR_CODE,
      statusCode: undefined,
    });
    await expect(client.get("/x")).rejects.toSatisfy(isApiError);
  });

  it("契约错误体 → ApiError,采用服务端 code/message/details", async () => {
    const { adapter } = makeAdapter(() =>
      httpError(400, {
        error: { code: "INVALID_NAME", message: "知识库名不合法", details: { field: "name" } },
      }),
    );
    const client = createApiClient({ adapter } as never);
    await expect(client.post("/knowledge-bases", {})).rejects.toMatchObject({
      code: "INVALID_NAME",
      message: "知识库名不合法",
      statusCode: 400,
      details: { field: "name" },
    });
  });

  it("非契约错误体的 5xx → ApiError,code=NETWORK_ERROR、带 statusCode", async () => {
    const { adapter } = makeAdapter(() => httpError(502, "<html>Bad Gateway</html>"));
    const client = createApiClient({ adapter, maxRetries: 0 } as never);
    await expect(client.get("/x")).rejects.toMatchObject({
      code: NETWORK_ERROR_CODE,
      statusCode: 502,
    });
  });

  it("所有失败都是 ApiError 实例", async () => {
    const { adapter } = makeAdapter(() => httpError(400, { error: { code: "BAD", message: "x" } }));
    const client = createApiClient({ adapter } as never);
    await expect(client.get("/x")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("401:拦截器统一处理跳转,不透传状态码给调用层", () => {
  it("有 onUnauthorized 时调用它,并仍抛出 ApiError", async () => {
    const onUnauthorized = vi.fn();
    const { adapter } = makeAdapter(() =>
      httpError(401, { error: { code: "UNAUTHORIZED", message: "登录已过期" } }),
    );
    const client = createApiClient({ adapter, onUnauthorized } as never);
    await expect(client.get("/conversations")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("非 401 不触发跳转回调", async () => {
    const onUnauthorized = vi.fn();
    const { adapter } = makeAdapter(() =>
      httpError(403, { error: { code: "FORBIDDEN", message: "无权限" } }),
    );
    const client = createApiClient({ adapter, onUnauthorized } as never);
    await expect(client.get("/admin/conversations")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe("retry 策略:仅幂等 GET、仅网络错误/5xx", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("GET 遇网络错误重试,最终成功", async () => {
    const { adapter, calls } = makeAdapter((attempt) =>
      attempt < 3 ? networkFailure() : { data: { ok: true } },
    );
    const client = createApiClient({ adapter, maxRetries: 2, baseDelayMs: 10 } as never);
    const promise = client.get("/knowledge-bases");
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toMatchObject({ data: { ok: true } });
    expect(calls).toHaveLength(3); // 首次 + 2 次重试
  });

  it("GET 5xx 重试,耗尽后抛 ApiError(code=NETWORK_ERROR)", async () => {
    const { adapter, calls } = makeAdapter(() => httpError(503, "unavailable"));
    const client = createApiClient({ adapter, maxRetries: 2, baseDelayMs: 10 } as never);
    const promise = client.get("/x");
    const assertion = expect(promise).rejects.toMatchObject({ code: NETWORK_ERROR_CODE });
    await vi.runAllTimersAsync();
    await assertion;
    expect(calls).toHaveLength(3);
  });

  it("POST 不重试(非幂等,防重复扣费/入库)", async () => {
    const { adapter, calls } = makeAdapter(() => networkFailure());
    const client = createApiClient({ adapter, maxRetries: 2, baseDelayMs: 10 } as never);
    const promise = client.post("/chat", {});
    const assertion = expect(promise).rejects.toBeInstanceOf(ApiError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(calls).toHaveLength(1); // 只发一次,绝不重试
  });

  it("GET 遇 4xx 不重试(客户端问题,重试无意义)", async () => {
    const { adapter, calls } = makeAdapter(() =>
      httpError(400, { error: { code: "BAD", message: "bad" } }),
    );
    const client = createApiClient({ adapter, maxRetries: 2, baseDelayMs: 10 } as never);
    const promise = client.get("/x");
    const assertion = expect(promise).rejects.toMatchObject({ code: "BAD" });
    await vi.runAllTimersAsync();
    await assertion;
    expect(calls).toHaveLength(1);
  });
});
