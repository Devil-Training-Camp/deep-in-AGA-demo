import {
  pgTable,
  bigserial,
  bigint,
  text,
  integer,
  timestamp,
  vector,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * 数据模型严格对齐 doc/architecture-design.md §三。
 *
 * 授权口径(不体现在表结构,靠数据访问层强制注入 —— 见 CLAUDE.md 模块边界):
 *  - knowledge_bases 无 owner 字段,全员平权(决策 6)。
 *  - 用户隔离只在历史层:conversations.user_id / messages 经 conversation 关联(决策 7)。
 *  - 不引入 tenant_id;本期为单租户、全员共享知识库。
 *
 * embedding 固定 1024 维(CLAUDE.md / 决策 7),走 pgvector 标准 vector 索引最简路径。
 */

// ── 用户 ──────────────────────────────────────────────
// 身份托管在 Supabase Auth;本表存业务侧的 role 等,role 由服务端受控写入,不信任客户端。
export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // Supabase Auth 托管密码,此列保留兼容,可为空
  role: text("role").notNull().default("user"), // 'user' | 'admin'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("users_role_check", sql`${t.role} IN ('user', 'admin')`),
]);

// ── 知识库(全员共享,无 owner)────────────────────────
export const knowledgeBases = pgTable("knowledge_bases", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 文档(全异步入库,status 驱动前端轮询)────────────
export const documents = pgTable("documents", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  knowledgeBaseId: bigint("knowledge_base_id", { mode: "number" })
    .notNull()
    .references(() => knowledgeBases.id, { onDelete: "cascade" }),
  uploadedBy: bigint("uploaded_by", { mode: "number" })
    .notNull()
    .references(() => users.id),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("pending"), // pending|processing|ready|failed
  errorReason: text("error_reason"), // nullable,failed 时回显具体原因
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check(
    "documents_status_check",
    sql`${t.status} IN ('pending', 'processing', 'ready', 'failed')`,
  ),
  index("documents_kb_idx").on(t.knowledgeBaseId),
]);

// ── 文档分块 + 向量 ──────────────────────────────────
export const docChunks = pgTable("doc_chunks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  knowledgeBaseId: bigint("knowledge_base_id", { mode: "number" })
    .notNull()
    .references(() => knowledgeBases.id, { onDelete: "cascade" }),
  documentId: bigint("document_id", { mode: "number" })
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }).notNull(),
}, (t) => [
  // HNSW 向量索引(决策 2:cosine ops,m=16 / ef_construction=64)
  index("doc_chunks_embedding_hnsw_idx")
    .using("hnsw", t.embedding.op("vector_cosine_ops"))
    .with({ m: 16, ef_construction: 64 }),
  // 知识库过滤索引(决策 3:应用层字段过滤,检索只在单库内)
  index("doc_chunks_kb_idx").on(t.knowledgeBaseId),
]);

// ── 历史:会话 ───────────────────────────────────────
export const conversations = pgTable("conversations", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("conversations_user_updated_idx").on(t.userId, t.updatedAt.desc()),
]);

// ── 历史:消息(append-only,不物理删除)──────────────
export const messages = pgTable("messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  conversationId: bigint("conversation_id", { mode: "number" })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("messages_role_check", sql`${t.role} IN ('user', 'assistant')`),
  index("messages_conv_seq_idx").on(t.conversationId, t.sequenceNumber),
]);
