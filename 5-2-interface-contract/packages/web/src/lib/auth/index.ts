// Supabase Auth 认证与鉴权(architecture-design.md 决策 5、决策 8)。
// session 读取:getCurrentUser / getCurrentUserWithRole(未登录返回 null,不抛错)。
// route 守卫:requireUser / requireAdmin(返回用户或统一错误 Response)。
export {
  createSupabaseServerClient,
  getCurrentUser,
  getCurrentUserWithRole,
  type AuthenticatedUser,
} from "./supabase-server";
export {
  requireUser,
  requireAdmin,
  type AuthErrorBody,
} from "./require-auth";
