import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { query } from "@kb/db";
import type { Role } from "@kb/shared";

/**
 * 服务端 Supabase 客户端 + session 读取。
 *
 * 授权决策一律走 auth.getUser()——它向 Supabase Auth 服务端校验 token,
 * 不同于信任 cookie 内容的 getSession()。未登录时返回 user: null,不抛错
 * (architecture-design.md 决策 5)。
 *
 * 只用 publishable(anon)key;service_role key 属机密,不在此层出现,
 * 更不得进前端 bundle(CLAUDE.md 密钥保护 P0)。
 */

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} 未设置:Supabase 连接参数只走服务端环境变量,不得硬编码。`,
    );
  }
  return value;
}

/**
 * 基于当前请求 cookie 创建服务端客户端。
 * 读路径(RSC/Route Handler)里 cookies 可能只读,故 setAll 出错时静默——
 * session 刷新交给 middleware,这里只负责读。
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    readEnv("SUPABASE_URL"),
    readEnv("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // RSC 渲染阶段 cookie 只读——忽略,由 middleware 负责写回刷新后的 session。
          }
        },
      },
    },
  );
}

/**
 * 读取当前登录用户。未登录返回 null(不抛错)。
 * 这是本模块对外的 session 读取入口。
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    // 未登录时 supabase-js 会带 AuthSessionMissingError 返回 user:null;
    // token 失效/校验失败也走 error。两种情况授权语义都等同"未登录",统一返回 null,
    // 由上层守卫决定拦截还是放行——本函数不抛错(决策 5)。
    return null;
  }
  return data.user;
}

export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  role: Role;
}

/**
 * 在 getCurrentUser 基础上补齐业务角色。
 *
 * role 不信任客户端、也不从 JWT claim 直接取,而是用 Supabase 用户 id
 * 查 users 表得到——角色是服务端受控数据(architecture-design.md 决策 5、决策 8)。
 * 参数化查询、显式列名,禁 SELECT *(CLAUDE.md 数据脱敏)。
 */
export async function getCurrentUserWithRole(): Promise<AuthenticatedUser | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const result = await query<{ role: Role }>(
    "SELECT role FROM users WHERE id = $1",
    [user.id],
  );
  const role = result.rows[0]?.role;
  if (!role) {
    // 通过了 Supabase 鉴权但业务库无此用户——按未授权处理,不默认给权限。
    return null;
  }
  return { id: user.id, email: user.email, role };
}
