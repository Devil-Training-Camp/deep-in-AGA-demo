import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "./index.ts";
import { conversations } from "./schema.ts";
import type { Conversation } from "./types.ts";

/**
 * 管理员审计路径 —— 全局只读,刻意不拼 user_id 过滤(决策 8)。
 *
 * 这是三条相反授权规则里"刻意不拼"的一条,单独成文件与用户私有路径物理隔离,
 * 避免有人在 conversations.ts 里误加 user 过滤、或在此误加。
 *
 * 调用方职责(不在数据层):
 *   - 必须已校验 role === 'admin'(正向逻辑,禁 role !== 'user')。
 *   - 必须审计到人:记录 admin_user_id + target_user_id(全系统唯一必审操作)。
 * 本函数只负责"不拼 user 过滤地查",鉴权与审计由 /api/admin 层完成。
 */
export async function listAllConversations(opts: {
  afterId?: number;
  limit?: number;
}): Promise<Conversation[]> {
  const limit = opts.limit ?? 50;
  const conds = opts.afterId !== undefined ? [lt(conversations.id, opts.afterId)] : [];
  return db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(conversations.id))
    .limit(limit);
}
