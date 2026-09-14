/**
 * MSW mock 的样例数据。全部按 schema 生成类型标注,字段齐全、不返回空对象,
 * 让本地开发看到接近真实契约的形态(含分页、状态机、失败原因等边界取值)。
 *
 * 类型来自 web 端由 schema.yaml 生成的 `api.schemas`——单一事实源,schema 改了这里会编译报错。
 */

import type {
  AuthResult,
  Conversation,
  ConversationPage,
  DeleteKnowledgeBaseResult,
  DocumentMeta,
  KnowledgeBase,
  Message,
  MessagePage,
  UploadDocumentResult,
  User,
} from "@/lib/api/generated/api.schemas";

/** 普通用户。role=user;password_hash 绝不出现在任何响应中。 */
export const mockUser: User = {
  id: "1001",
  email: "alice@example.com",
  role: "user",
  createdAt: "2026-09-01T08:30:00.000Z",
};

/** 管理员用户,唯一特权是只读 /api/admin/*。 */
export const mockAdminUser: User = {
  id: "1",
  email: "admin@example.com",
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
};

/** 登录/注册成功结果。Supabase Auth 下登录态走 cookie,token 为兼容字段。 */
export const mockAuthResult: AuthResult = {
  user: mockUser,
  token: "mock-session-token",
};

/** 知识库列表(全员共享,无 owner 字段)。 */
export const mockKnowledgeBases: KnowledgeBase[] = [
  { id: "10", name: "产品手册", createdAt: "2026-08-20T10:00:00.000Z" },
  { id: "11", name: "研发规范", createdAt: "2026-08-22T14:15:00.000Z" },
  { id: "12", name: "客服 FAQ", createdAt: "2026-09-02T09:05:00.000Z" },
];

/** 单个新建的知识库(POST 回显)。 */
export const mockCreatedKnowledgeBase: KnowledgeBase = {
  id: "13",
  name: "新建知识库",
  createdAt: "2026-09-11T03:00:00.000Z",
};

/** 删除知识库结果,带级联影响量供审计。 */
export const mockDeleteKbResult: DeleteKnowledgeBaseResult = {
  id: "10",
  deletedDocuments: 8,
  deletedChunks: 214,
};

/**
 * 库内文档列表,覆盖状态机的全部取值(pending/processing/ready/failed),
 * 失败项带上 errorReason,便于前端演练四种状态与失败提示。
 */
export const mockDocuments: DocumentMeta[] = [
  {
    id: "100",
    knowledgeBaseId: "10",
    fileName: "产品白皮书.pdf",
    fileType: "pdf",
    status: "ready",
    createdAt: "2026-08-20T10:05:00.000Z",
  },
  {
    id: "101",
    knowledgeBaseId: "10",
    fileName: "接口说明.docx",
    fileType: "docx",
    status: "processing",
    createdAt: "2026-09-10T11:20:00.000Z",
  },
  {
    id: "102",
    knowledgeBaseId: "10",
    fileName: "更新日志.txt",
    fileType: "txt",
    status: "pending",
    createdAt: "2026-09-11T02:58:00.000Z",
  },
  {
    id: "103",
    knowledgeBaseId: "10",
    fileName: "扫描合同.pdf",
    fileType: "pdf",
    status: "failed",
    errorReason: "scanned_no_text",
    createdAt: "2026-09-09T16:40:00.000Z",
  },
];

/** 单份文档(轮询状态用),取一个已就绪的。 */
export const mockDocument: DocumentMeta = mockDocuments[0]!;

/** 上传即时返回,status 固定 pending。 */
export const mockUploadResult: UploadDocumentResult = {
  documentId: "104",
  status: "pending",
};

/** 当前用户的会话(historys 按 user_id 私有)。 */
export const mockConversations: Conversation[] = [
  {
    id: "500",
    userId: "1001",
    title: "如何配置 pgvector 索引",
    createdAt: "2026-09-08T09:00:00.000Z",
    updatedAt: "2026-09-08T09:12:00.000Z",
  },
  {
    id: "501",
    userId: "1001",
    title: "文档上传失败排查",
    createdAt: "2026-09-10T13:30:00.000Z",
    updatedAt: "2026-09-10T13:45:00.000Z",
  },
];

/** 会话分页(游标分页,nextCursor 为 null 表示末页)。 */
export const mockConversationPage: ConversationPage = {
  items: mockConversations,
  nextCursor: null,
};

/**
 * 一轮问答的消息:user 提问 + assistant 回答。
 * assistant 带 grounded 标记(此处命中文档依据);sequenceNumber 递增。
 */
export const mockMessages: Message[] = [
  {
    id: "9000",
    conversationId: "500",
    role: "user",
    content: "pgvector 的 HNSW 索引怎么建?",
    sequenceNumber: 0,
    createdAt: "2026-09-08T09:00:05.000Z",
  },
  {
    id: "9001",
    conversationId: "500",
    role: "assistant",
    content: "先启用扩展 CREATE EXTENSION vector,再对 vector(1024) 列建 HNSW 索引……",
    sequenceNumber: 1,
    grounded: true,
    createdAt: "2026-09-08T09:00:09.000Z",
  },
];

/** 消息分页。 */
export const mockMessagePage: MessagePage = {
  items: mockMessages,
  nextCursor: null,
};

/**
 * 管理员视角的全局会话分页(跨 user_id,刻意不拼过滤)。
 * 混入另一个用户的会话,直观体现 admin 能看到全体而非仅自己。
 */
export const mockAdminConversationPage: ConversationPage = {
  items: [
    ...mockConversations,
    {
      id: "700",
      userId: "1002",
      title: "另一个用户的会话",
      createdAt: "2026-09-07T20:00:00.000Z",
      updatedAt: "2026-09-07T20:30:00.000Z",
    },
  ],
  nextCursor: null,
};
