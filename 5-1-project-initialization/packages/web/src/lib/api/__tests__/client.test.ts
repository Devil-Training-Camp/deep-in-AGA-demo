import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, AxiosResponse } from "axios";
import { AxiosHeaders } from "axios";
import { createApiClient } from "../client.js";
import { AuthError, BusinessError, NetworkError } from "../errors.js";

/**
 * 用可编程的自定义 adapter 拦截请求,不发真实网络。
 * 每次调用把请求配置记录进 calls,并按预设脚本返回/抛出,便于断言重试次数与归一化结果。
 */
type Handler = (attempt: number) => Promise<AxiosResponse> | AxiosResponse;

function makeAdapter(handler: Handler): { adapter: AxiosAdapter; calls: { method?: string; headers: Record<string, unknown> }[] } {
  const calls: { method?: string; headers: Record<string, unknown> }[] = [];
  const adapter: AxiosAdapter = (config) => {
    calls.push({
      method: config.method,
      headers: AxiosHeaders.from(config.headers).toJSON(),
    });
    const result = handler(calls.length);
    return Promise.resolve(result).then((res) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: undefined,
      ...res,
    }));
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

describe("响应拦截器:错误归一化", () => {
  it("无响应 → NetworkError", async () => {
    const { adapter } = makeAdapter(() => networkFailure());
    const client = createApiClient({ adapter, maxRetries: 0 } as never);
    await expect(client.get("/x")).rejects.toBeInstanceOf(NetworkError);
  });

  it("401 → AuthError,携带状态码", async () => {
    const { adapter } = makeAdapter(() =>
      httpError(401, { error: { code: "UNAUTHORIZED", message: "登录已过期" } }),
    );
    const client = createApiClient({ adapter } as never);
    await expect(client.get("/conversations")).rejects.toMatchObject({
      kind: "auth",
      statusCode: 401,
      message: "登录已过期",
    });
  });

  it("403 → AuthError", async () => {
    const { adapter } = makeAdapter(() => httpError(403, { error: { code: "FORBIDDEN", message: "无权限" } }));
    const client = createApiClient({ adapter } as never);
    await expect(client.get("/admin/conversations")).rejects.toBeInstanceOf(AuthError);
  });

  it("400 + 契约错误体 → BusinessError,携带 code", async () => {
    const { adapter } = makeAdapter(() =>
      httpError(400, { error: { code: "INVALID_NAME", message: "知识库名不合法" } }),
    );
    const client = createApiClient({ adapter } as never);
    await expect(client.post("/knowledge-bases", {})).rejects.toMatchObject({
      kind: "business",
      code: "INVALID_NAME",
      statusCode: 400,
    });
    await expect(client.post("/knowledge-bases", {})).rejects.toBeInstanceOf(BusinessError);
  });

  it("非契约错误体的 5xx → NetworkError(不当成业务错误)", async () => {
    const { adapter } = makeAdapter(() => httpError(502, "<html>Bad Gateway</html>"));
    const client = createApiClient({ adapter, maxRetries: 0 } as never);
    await expect(client.get("/x")).rejects.toBeInstanceOf(NetworkError);
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

  it("GET 5xx 重试,耗尽后抛 NetworkError", async () => {
    const { adapter, calls } = makeAdapter(() => httpError(503, "unavailable"));
    const client = createApiClient({ adapter, maxRetries: 2, baseDelayMs: 10 } as never);
    const promise = client.get("/x");
    const assertion = expect(promise).rejects.toBeInstanceOf(NetworkError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(calls).toHaveLength(3);
  });

  it("POST 不重试(非幂等,防重复扣费/入库)", async () => {
    const { adapter, calls } = makeAdapter(() => networkFailure());
    const client = createApiClient({ adapter, maxRetries: 2, baseDelayMs: 10 } as never);
    const promise = client.post("/chat", {});
    const assertion = expect(promise).rejects.toBeInstanceOf(NetworkError);
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
    const assertion = expect(promise).rejects.toBeInstanceOf(BusinessError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(calls).toHaveLength(1);
  });
});
