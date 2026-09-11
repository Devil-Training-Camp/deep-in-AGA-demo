/**
 * 领域类型 —— 全系统单一事实源,由 web / db 共同引用。
 * 字段与取值均来自 architecture-design.md 的 DDL/API 契约与 CLAUDE.md 的行为约束,
 * 不在此处引入未经文档确认的字段。
 */

/** JWT claim 里的角色。admin 的唯一特权是只读 /api/admin/* 路径(CLAUDE.md 二、数据边界)。 */
export type Role = "user" | "admin";

/** 文档全异步入库的状态机,前端轮询此字段(CLAUDE.md 功能行为约束:文档全异步入库)。 */
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

/**
 * 入库失败原因,必须可区分三类(nonfunctional-requirements.md P1 document_ingest_failed):
 * - scanned_no_text:扫描件拦截,产品边界内的正常拒绝,非异常
 * - parse_error:解析失败,真异常
 * - unsupported_format:格式不支持
 */
export type IngestFailReason = "scanned_no_text" | "parse_error" | "unsupported_format";

/** 一条问答消息的角色。messages 表 append-only,不物理删除(CLAUDE.md 二、数据边界)。 */
export type MessageRole = "user" | "assistant";

/** 用户账号。password_hash 绝不出现在任何响应/日志中(CLAUDE.md 安全 P0)。 */
export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

/** 知识库:全员共享,无 owner 字段(CLAUDE.md 二、数据边界:知识库全员平权)。 */
export interface KnowledgeBase {
  id: string;
  name: string;
  createdAt: string;
}

/** 文档元数据。失败时带 errorReason,不入库空内容。 */
export interface DocumentMeta {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileType: "pdf" | "docx" | "txt";
  status: DocumentStatus;
  errorReason?: IngestFailReason;
  createdAt: string;
}

/** 会话容器的轻量元数据(tech-selection.md §6:conversations + messages 两表)。 */
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 一条问答记录。grounded 标记该回答当时是否有文档依据;
 * 中断产生的残答不写此表,仅完整回答才落库(CLAUDE.md 残答落库语义)。
 */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sequenceNumber: number;
  grounded?: boolean;
  createdAt: string;
}
