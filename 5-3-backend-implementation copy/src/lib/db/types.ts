import type {
  users,
  knowledgeBases,
  documents,
  docChunks,
  conversations,
  messages,
} from "./schema.ts";

/**
 * 实体类型统一从 Drizzle schema 派生($inferSelect / $inferInsert),schema 即单一事实源。
 *
 * 提示原文要求「复用 packages/shared 里已有的类型」——本项目不存在 packages/shared,
 * 也不是 monorepo 布局。不凭空造一个 shared 包(会与 src/lib 单包结构冲突),
 * 而是从 schema 推导,这本就是 Drizzle 的标准做法,避免类型与表结构脱节。
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type NewKnowledgeBase = typeof knowledgeBases.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export type DocChunk = typeof docChunks.$inferSelect;
export type NewDocChunk = typeof docChunks.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageRole = "user" | "assistant";
