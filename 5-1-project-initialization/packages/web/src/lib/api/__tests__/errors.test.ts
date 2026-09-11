import { describe, expect, it } from "vitest";
import {
  ApiError,
  AuthError,
  BusinessError,
  NetworkError,
  isErrorEnvelope,
} from "../errors.js";

describe("isErrorEnvelope", () => {
  it("识别符合契约的 { error: { code, message } }", () => {
    expect(isErrorEnvelope({ error: { code: "X", message: "y" } })).toBe(true);
  });

  it("拒绝缺字段 / 类型不符 / 非对象", () => {
    expect(isErrorEnvelope({ error: { code: "X" } })).toBe(false);
    expect(isErrorEnvelope({ error: { code: 1, message: "y" } })).toBe(false);
    expect(isErrorEnvelope({ message: "y" })).toBe(false);
    expect(isErrorEnvelope(null)).toBe(false);
    expect(isErrorEnvelope("oops")).toBe(false);
  });
});

describe("错误类型层级", () => {
  it("三类错误都是 ApiError,kind 可区分", () => {
    const net = new NetworkError("net");
    const auth = new AuthError("auth", 401);
    const biz = new BusinessError("CODE", "biz", 400);

    for (const e of [net, auth, biz]) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e).toBeInstanceOf(Error);
    }
    expect(net.kind).toBe("network");
    expect(auth.kind).toBe("auth");
    expect(biz.kind).toBe("business");
  });

  it("BusinessError 携带 code,AuthError 携带状态码", () => {
    const biz = new BusinessError("INVALID_NAME", "名称不合法", 422);
    expect(biz.code).toBe("INVALID_NAME");
    expect(biz.statusCode).toBe(422);

    const auth = new AuthError("过期", 401);
    expect(auth.statusCode).toBe(401);
  });

  it("NetworkError 无状态码时 statusCode 为 undefined,并保留 cause", () => {
    const cause = new Error("underlying");
    const net = new NetworkError("失败", undefined, { cause });
    expect(net.statusCode).toBeUndefined();
    expect(net.cause).toBe(cause);
  });

  it("name 为具体子类名,便于日志识别", () => {
    expect(new NetworkError("x").name).toBe("NetworkError");
    expect(new AuthError("x", 401).name).toBe("AuthError");
    expect(new BusinessError("c", "x", 400).name).toBe("BusinessError");
  });
});
