/**
 * API 统一错误响应体的**线格式**别名(architecture-design.md §四:{ error: { code, message } })。
 *
 * 单一事实源是 `api.ts`(由 schema.yaml 生成);此处只取别名,不手写字段。
 * 名为 `ApiErrorResponse` 而非 `ApiError`,是为了和前端 `lib/api/errors.ts` 里那个
 * 消费侧的 `ApiError` **类**区分:这里是网络上的对象形态,那里是抛给调用层的错误实例。
 */

import type { components } from "./api.js";

/** `{ error: { code, message, details? } }` 错误响应体。 */
export type ApiErrorResponse = components["schemas"]["ApiError"];

/** 错误响应里的 error 负载:`{ code, message, details? }`。 */
export type ApiErrorPayload = components["schemas"]["ApiError"]["error"];
