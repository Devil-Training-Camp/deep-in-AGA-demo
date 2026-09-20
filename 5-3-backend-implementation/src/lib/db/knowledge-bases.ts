import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { knowledgeBases } from "./schema.ts";
import type { KnowledgeBase } from "./types.ts";

/**
 * 知识库 CRUD —— 全员平权(决策 6)。
 *
 * 授权红线:知识库无 owner、不拼 user_id 过滤。任何登录用户可建/看/用/删。
 * 所以这些函数刻意不接收 currentUserId —— 一旦这里出现 user 过滤,就是 bug。
 */

export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
  return db
    .select({
      id: knowledgeBases.id,
      name: knowledgeBases.name,
      createdAt: knowledgeBases.createdAt,
    })
    .from(knowledgeBases)
    .orderBy(knowledgeBases.createdAt);
}

export async function getKnowledgeBase(id: number): Promise<KnowledgeBase | null> {
  const rows = await db
    .select({
      id: knowledgeBases.id,
      name: knowledgeBases.name,
      createdAt: knowledgeBases.createdAt,
    })
    .from(knowledgeBases)
    .where(eq(knowledgeBases.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createKnowledgeBase(name: string): Promise<KnowledgeBase> {
  const rows = await db.insert(knowledgeBases).values({ name }).returning();
  return rows[0];
}

/**
 * 删除知识库:ON DELETE CASCADE 一并清除 documents 与 doc_chunks。
 * 返回是否删到行,便于上层记录级联影响(操作者/时间由调用方审计)。
 */
export async function deleteKnowledgeBase(id: number): Promise<boolean> {
  const rows = await db
    .delete(knowledgeBases)
    .where(eq(knowledgeBases.id, id))
    .returning({ id: knowledgeBases.id });
  return rows.length > 0;
}
