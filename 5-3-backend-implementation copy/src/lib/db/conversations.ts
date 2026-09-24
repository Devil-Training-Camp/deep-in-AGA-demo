import { and, eq, desc, lt, max } from "drizzle-orm";
import { db } from "./index.ts";
import { conversations, messages } from "./schema.ts";
import type { Conversation, Message, MessageRole } from "./types.ts";

/**
 * 历史记录 CRUD —— 按 user_id 私有(决策 7)。
 *
 * 授权红线:普通用户的每个读函数签名强制带 currentUserId,并在函数内拼
 * WHERE user_id / 校验会话归属。授权在数据层强制,业务代码无法漏拼。
 * 管理员的全局只读路径不在此文件,单独放 admin.ts(刻意不拼 user_id)。
 *
 * messages 为 append-only —— 不提供物理删除函数(审计要求)。
 */

// ── 会话 ──────────────────────────────────────────────

/** 仅返回当前用户的会话(强制 user_id 过滤)。 */
export async function listConversationsByUser(currentUserId: number): Promise<Conversation[]> {
  return db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, currentUserId))
    .orderBy(desc(conversations.updatedAt));
}

/**
 * 取会话并校验归属当前用户(防 IDOR)。
 * 归属不符时返回 null —— 上层据此返回 404/403,不泄露"存在但不属于你"。
 */
export async function getConversationForUser(
  id: number,
  currentUserId: number,
): Promise<Conversation | null> {
  const rows = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, currentUserId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createConversation(
  currentUserId: number,
  title?: string,
): Promise<Conversation> {
  const rows = await db
    .insert(conversations)
    .values({ userId: currentUserId, title: title ?? null })
    .returning();
  return rows[0];
}

export async function touchConversation(id: number): Promise<void> {
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));
}

// ── 消息(append-only)────────────────────────────────

/**
 * 取会话消息,先校验会话归属当前用户(防 IDOR),再按 sequence 游标分页。
 * 归属不符返回 null;归属成立返回该页消息。
 */
export async function listMessagesForUser(
  conversationId: number,
  currentUserId: number,
  opts: { afterSequence?: number; limit?: number } = {},
): Promise<Message[] | null> {
  const owns = await getConversationForUser(conversationId, currentUserId);
  if (!owns) return null;

  const limit = opts.limit ?? 50;
  const cursor = opts.afterSequence;
  const conds = [eq(messages.conversationId, conversationId)];
  if (cursor !== undefined) {
    conds.push(lt(messages.sequenceNumber, cursor)); // 游标向前翻,配合 (conversation_id, sequence_number) 索引
  }
  return db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      role: messages.role,
      content: messages.content,
      sequenceNumber: messages.sequenceNumber,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(and(...conds))
    .orderBy(desc(messages.sequenceNumber))
    .limit(limit);
}

/**
 * 追加一条消息(append-only)。sequence_number 取该会话当前 max + 1。
 * 注:仅完整生成的回答才落库;中断残答不调用此函数(残答无审计价值)。
 */
export async function appendMessage(input: {
  conversationId: number;
  role: MessageRole;
  content: string;
}): Promise<Message> {
  const seqRows = await db
    .select({ maxSeq: max(messages.sequenceNumber) })
    .from(messages)
    .where(eq(messages.conversationId, input.conversationId));
  const nextSeq = (seqRows[0]?.maxSeq ?? 0) + 1;

  const rows = await db
    .insert(messages)
    .values({ ...input, sequenceNumber: nextSeq })
    .returning();
  return rows[0];
}
