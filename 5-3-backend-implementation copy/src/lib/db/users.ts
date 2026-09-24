import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { users } from "./schema.ts";
import type { User } from "./types.ts";

/**
 * 用户 CRUD —— 身份托管在 Supabase Auth,本表存业务侧 role 等。
 *
 * 授权红线:role 由服务端受控写入,不信任客户端传入。
 * 响应/日志绝不外泄 password_hash —— 故读函数默认不选该列。
 */

const SAFE_COLUMNS = {
  id: users.id,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
};

/** 授权决策专用:getUser() 拿到身份后,据 email 查库得到 role(不信任客户端角色)。 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await db.select(SAFE_COLUMNS).from(users).where(eq(users.email, email)).limit(1);
  return (rows[0] as User) ?? null;
}

export async function getUserById(id: number): Promise<User | null> {
  const rows = await db.select(SAFE_COLUMNS).from(users).where(eq(users.id, id)).limit(1);
  return (rows[0] as User) ?? null;
}

/** 首次登录时把 Supabase 身份落一行业务用户,role 默认 'user'。 */
export async function upsertUser(email: string): Promise<User> {
  const rows = await db
    .insert(users)
    .values({ email })
    .onConflictDoNothing({ target: users.email })
    .returning(SAFE_COLUMNS);
  if (rows[0]) return rows[0] as User;
  // 已存在:回查(不返回 password_hash)
  const existing = await getUserByEmail(email);
  return existing!;
}
