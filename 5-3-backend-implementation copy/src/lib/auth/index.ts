import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { users } from "../db/schema.ts";

/**
 * 认证封装 —— **最小占位实现**(2026-09-15)。
 *
 * ⚠️ 这是占位,不是终态。终态见 CLAUDE.md /「决策 5」:用 Supabase Auth 托管身份,
 *    服务端用 `@supabase/ssr` 的 `createServerClient` 从 httpOnly cookie 读 session,
 *    授权决策走 `supabase.auth.getUser()`(向 Auth 服务端校验,**不信任 getSession()**)。
 *    但 `@supabase/ssr` 尚未安装、Supabase 项目 env 也未接通,故本文件先给一个能编译、
 *    能让 /api/chat 主链路跑通的占位,把「取当前用户 + 从 users 表查 role」的形状定下来,
 *    接通 Supabase 时只替换 resolveAuthUserId 的实现,route 与调用方不动。
 *
 * 无论占位还是终态,两条红线都必须成立:
 *   - **role 由服务端从 users 表查得,绝不信任客户端传入**(下面 role 只从 DB 读)。
 *   - session 的真伪由服务端校验,**绝不从请求体/自定义头直接读 userId 当身份**
 *     (那等于任何人可冒充)。占位阶段用受控的 dev 通道(见 resolveAuthUserId 注释),
 *     线上换成 Supabase getUser() 的校验结果。
 */

export interface AuthUser {
  id: number;
  role: "user" | "admin";
}

/**
 * 从请求解析出「已通过服务端校验」的用户 ID。
 *
 * 【占位实现】当前只认一个受控的开发通道:环境变量 `DEV_AUTH_USER_ID`。
 *   - 存在 → 视为已登录该用户(仅供本地/联调,绝不用于生产)。
 *   - 不存在 → 返回 null(未认证)。
 * 不从请求头/请求体读取任何 userId —— 避免占位期就埋下"客户端自称身份"的越权口子。
 *
 * 【终态实现】替换为:
 *   const supabase = createServerClient(url, publishableKey, { cookies: ... from request });
 *   const { data, error } = await supabase.auth.getUser();
 *   if (error || !data.user) return null;
 *   // 再用 data.user.email / sub 在 users 表定位业务侧 id。
 */
async function resolveAuthUserId(_request: Request): Promise<number | null> {
  const devId = process.env.DEV_AUTH_USER_ID;
  if (devId && devId.trim() !== "") {
    const n = Number(devId);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

/**
 * 取当前请求的已认证用户;未认证返回 null(上层据此返回 401)。
 * role 一律从 users 表查(服务端权威),不信任任何客户端输入。
 */
export async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  const userId = await resolveAuthUserId(request);
  if (userId === null) return null;

  // 显式列选,禁 SELECT *(不外泄 password_hash 等敏感列)。role 只从 DB 读。
  const rows = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return null; // 会话指向的用户已不存在 → 视为未认证
  const role = row.role === "admin" ? "admin" : "user";
  return { id: row.id, role };
}
