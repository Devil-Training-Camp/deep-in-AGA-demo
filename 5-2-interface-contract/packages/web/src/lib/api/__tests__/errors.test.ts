import { describe, expect, it } from "vitest";
import { ApiError, isApiError, isErrorEnvelope, NETWORK_ERROR_CODE } from "../errors.js";

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

describe("ApiError", () => {
  it("是 Error 子类,携带 code / message / statusCode / details", () => {
    const err = new ApiError({
      code: "INVALID_NAME",
      message: "名称不合法",
      statusCode: 422,
      details: { field: "name" },
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.code).toBe("INVALID_NAME");
    expect(err.message).toBe("名称不合法");
    expect(err.statusCode).toBe(422);
    expect(err.details).toEqual({ field: "name" });
  });

  it("网络层失败:无 statusCode,保留 cause", () => {
    const cause = new Error("underlying");
    const err = new ApiError({ code: NETWORK_ERROR_CODE, message: "失败", cause });
    expect(err.statusCode).toBeUndefined();
    expect(err.cause).toBe(cause);
  });
});

describe("isApiError", () => {
  it("对 ApiError 实例返回 true", () => {
    expect(isApiError(new ApiError({ code: "X", message: "y" }))).toBe(true);
  });

  it("鸭子判定:name + string code 也认(跨打包边界 instanceof 失效时兜底)", () => {
    expect(isApiError({ name: "ApiError", code: "X", message: "y" })).toBe(true);
  });

  it("对普通 Error / 非错误值返回 false", () => {
    expect(isApiError(new Error("plain"))).toBe(false);
    expect(isApiError({ code: "X" })).toBe(false); // name 不符
    expect(isApiError(null)).toBe(false);
    expect(isApiError("oops")).toBe(false);
  });
});
