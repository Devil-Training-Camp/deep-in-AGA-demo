import { getCurrentUserWithRole, type AuthenticatedUser } from "./supabase-server";

/**
 * Route Handler 层的鉴权守卫。
 *
 * 与错误响应契约对齐:未登录/无权限时返回统一的 { error: { code, message } }
 * (architecture-design.md:248),而不是裸抛。调用方拿到 user 或 Response 二选一。
 */

export interface AuthErrorBody {
  error: { code: string; message: string };
}

function unauthorized(): Response {
  const body: AuthErrorBody = {
    error: { code: "UNAUTHORIZED", message: "未登录或登录态已失效。" },
  };
  return Response.json(body, { status: 401 });
}

function forbidden(): Response {
  const body: AuthErrorBody = {
    error: { code: "FORBIDDEN", message: "无权访问该资源。" },
  };
  return Response.json(body, { status: 403 });
}

/**
 * 要求已登录。返回带 role 的用户,或一个 401 Response。
 * 用法:const auth = await requireUser(); if (auth instanceof Response) return auth;
 */
export async function requireUser(): Promise<AuthenticatedUser | Response> {
  const user = await getCurrentUserWithRole();
  if (!user) {
    return unauthorized();
  }
  return user;
}

/**
 * 要求管理员。正向判定 role === 'admin',绝不用 role !== 'user' 反向逻辑
 * (CLAUDE.md 安全 P0:反向逻辑会把未知角色误放行)。
 */
export async function requireAdmin(): Promise<AuthenticatedUser | Response> {
  const user = await getCurrentUserWithRole();
  if (!user) {
    return unauthorized();
  }
  if (user.role !== "admin") {
    return forbidden();
  }
  return user;
}
