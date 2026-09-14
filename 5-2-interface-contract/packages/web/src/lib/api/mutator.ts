/**
 * orval 自定义 mutator —— 让「由 schema.yaml 生成的请求函数」全部走 5.1 节的 axios 基础层。
 *
 * 生成代码(`generated/`)只声明「调哪个方法、传什么类型」,真正发请求交给这里:
 * 复用 {@link createApiClient} 那一份实例,鉴权头注入、幂等重试、错误归一化(→ ApiError 三类)
 * 全部继承,不在生成层重复实现,也不让生成代码另起一个裸 axios(那样会绕过基础层的所有约束)。
 *
 * baseURL 从环境变量读:后端 API 前缀不是机密,可用 `NEXT_PUBLIC_` 暴露给浏览器;
 * 缺省时回落到基础层默认的 `/api`(同源部署下前端与 API 同域,无需显式配置)。
 * 密钥(JWT 签名密钥、云 API key、PG 连接串)绝不走这里——token 由 getToken 惰性提供,
 * 见 architecture-design.md:248 与 CLAUDE.md「密钥只存服务端环境变量」。
 *
 * 注意:SSE 的 `POST /api/chat` 不在生成范围内(orval 配置里按 `tags: [chat]` 排除),
 * 它走 fetch + AbortController 的独立流式客户端,套不上 axios 的错误归一化(client.ts:13)。
 */

import { createApiClient, type ApiClientOptions } from "./client.js";
import type { ApiError } from "./errors.js";
import type { AxiosRequestConfig } from "axios";

/** 后端 API 前缀。非机密,允许 `NEXT_PUBLIC_` 暴露;未配置时用基础层默认值 `/api`。 */
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * token 来源。占位:接入 Supabase Auth 后由会话层提供当前 access token(见架构决策 5)。
 * 返回 undefined 表示未登录,基础层就不注入 Authorization。绝不硬编码 token。
 */
const getToken: ApiClientOptions["getToken"] = () => undefined;

// 整个前端共用一份实例:拦截器、重试计数、连接配置只初始化一次。
const instance = createApiClient({
  ...(baseURL ? { baseURL } : {}),
  getToken,
});

/**
 * orval 生成的每个请求函数最终调用它。合并 orval 传入的 config 与调用方的 options,
 * 发请求,取 `response.data` 返回——生成函数因此直接 resolve 成契约里的响应体类型。
 * 失败已由基础层响应拦截器归一化为 {@link ApiError},此处不再二次包装。
 */
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return instance({ ...config, ...options }).then((response) => response.data as T);
};

/** orval 用它标注生成函数的错误类型。基础层已把失败归一化为 ApiError 三个子类。 */
export type ErrorType<_Error = unknown> = ApiError;

/** orval 用它标注请求体类型;此处按默认透传,不改写。 */
export type BodyType<BodyData> = BodyData;
