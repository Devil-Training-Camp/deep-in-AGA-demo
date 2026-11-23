# 智能知识问答系统

AI 知识问答系统：用户上传文档、分知识库管理，基于文档内容提问，系统返回带依据标注的回答，支持 SSE 流式输出和多轮对话。面向公司内部员工，本期不对外。

> 决策依据不在本文件。需要推导过程时回查：`requirements.md`（做什么）、`tech-selection.md`（选型推导）、`architecture-design.md`（落地设计，**技术栈以此为准**）、`nonfunctional-requirements.md`（埋点/性能/安全验收）。

## 一、技术栈约束

- **后端**：Next.js API Routes，`next start` 跑在**单个长驻 Node 进程**（非 serverless）。SSE Route Handler 必须声明 `export const runtime = "nodejs"` 与 `export const dynamic = "force-dynamic"`。
- **前端**：React + TypeScript。
- **数据库**：Supabase 托管的 PostgreSQL，启用 `pgvector` 扩展；数据与 Auth 用同一个 Supabase 项目。**不引入 Redis 或任何新的独立服务。**
- **向量存储**：pgvector，`vector(1024)` 类型 + HNSW 索引。Embedding 固定 **1024 维**（pgvector 标准 `vector` 索引上限 2000 维，选 1024 维走最简单建表路径）。
- **任务队列**：`pg-boss`，用 PostgreSQL 当队列，不额外部署队列服务。
- **文档解析**：PDF 用 `pdf-parse`(MIT)，`.docx` 用 `mammoth`(BSD)，TXT 用 Node 内置 `fs`。纯 JS、无系统依赖，不牵涉 copyleft 许可。
- **LLM / Embedding**：均走云 API，不自托管。具体厂商未定，业务代码只依赖 `lib/llm/` 的抽象接口，不直接引任何厂商 SDK（见 `architecture-design.md` §六 供应商抽象层）。
- **ORM**：Drizzle ORM，原生支持 pgvector 的 `vector` 类型——`embedding` 用 `vector({ dimensions: 1024 })` 列建模，相似度检索走内置 `cosineDistance`（`<=>`），扩展启用与建表、HNSW 索引一并写进 Drizzle migration（见 `architecture-design.md` §三 ORM 注意事项）。
- **认证**:**Supabase Auth** 托管身份(2026-09-09 由自建 JWT 变更,见 `architecture-design.md` 决策 5)。邮箱+密码登录,session 存 httpOnly cookie,服务端用 `@supabase/ssr` 的 `createServerClient` 读取,授权决策走 `supabase.auth.getUser()`(向 Auth 服务端校验,非信任 `getSession()`)。`role`(`user`/`admin`)由服务端从 `users` 表查得,**不信任客户端传入的角色**。Supabase URL/publishable key 走 env;**service_role key 属机密,只存服务端 env**。

## 二、模块边界

目录结构见 `architecture-design.md` §六 项目目录结构。各模块职责与不可越界的红线：

- `lib/session/`：进程内会话内存，`session_id` 索引最近 N 轮（默认 6）。**只服务多轮对话上下文，绝不读 `messages` 历史表**——"历史不作为上下文"靠这条读路径分离实现，不靠表字段。
- `lib/rag/`：分块、向量检索、query rewriting。检索前先用小模型把追问改写成独立问题再检索。
- `lib/ingestion/`：解析、扫描件阈值判定、pg-boss worker。逐格式独立 try/catch。
- `lib/llm/`：厂商抽象层。`streamChat` / `rewrite` / `embed`，返回 1024 维。
- `lib/db/`：PG 连接、迁移、pgvector 查询。
- `lib/auth/`：Supabase Auth 封装。`@supabase/ssr` 的 `createServerClient` 读 session，授权走 `getUser()`；`role` 从 `users` 表查得，不信任客户端。
- `config/params.ts`：集中管理可调参数（见下）。

数据边界：

- **知识库全员共享**，无 owner 字段，任何登录用户可建/看/用/删。检索只在单个 `knowledge_base_id` 内，**不跨库**。
- **历史记录按 `user_id` 私有**。普通用户所有历史查询在数据访问层强制注入 `WHERE user_id = :currentUser`；`messages` 为 append-only，不物理删除（审计要求）。
- **管理员的唯一特权**是一条独立只读路径 `/api/admin/*`，查看所有 `user_id` 的问答记录，此路径**刻意不拼 `user_id` 过滤**。除此之外与普通用户能力一致。

数据模型与接口契约见 `architecture-design.md` §三 数据模型（DDL）、§四 API 接口契约。

## 三、必须遵守的规范

### 安全（P0，上线阻断项）

- **三条相反的授权规则不能混淆**：知识库不拼 user 过滤（全员平权）／历史强制拼 `user_id`／admin 路径刻意不拼。这是越权风险最密集处，数据访问层统一处理，不在业务代码里手写。
- SSE (`/api/chat`)：连接握手时用 `supabase.auth.getUser()` 校验 session;请求体 `sessionId` 必须校验归属当前 `user_id`，禁止读他人上下文。
- `/api/conversations/:id/messages` 必须校验 `:id` 归属当前用户（防 IDOR）。
- `/api/admin/*` 校验 `role === 'admin'`，**不得用 `role !== 'user'` 这类反向逻辑**。
- 认证入口限流：`login` 按 IP/账号限失败次数；`register` 按拍板的开放度约束，不得默认任意邮箱可注册。
- **密钥只存服务端环境变量**：Supabase service_role key、云 API 密钥、PG 连接串绝不硬编码、绝不进前端 bundle（禁 `NEXT_PUBLIC_` 前缀）、不进日志/错误响应。
- **敏感字段绝不外泄**：查询禁用 `SELECT *`，响应/日志绝不含 `password_hash`；`messages.content` 禁止进排障日志；日志需要邮箱时降级为 `email_domain`。
- 破坏性操作（删知识库/文档）服务端须记录操作者、时间、级联影响量——前端二次确认不构成后端防护。

### 功能行为约束

- **答案依据标注**：检索最高相似度 < `GROUNDED_SIMILARITY_THRESHOLD` 时，SSE 发 `event: meta {grounded: false}`，回答中标明属常识推测，不伪装成文档依据；命中则 `grounded: true`。
- **扫描件拦截**：解析后累计字符数低于 `SCAN_TEXT_THRESHOLD` 判为扫描件，文档置 `failed` + `error_reason`，不入库空内容（纯文本解析库对扫描件静默返回空串、不抛异常，必须显式判定）。本期不引入 OCR。
- **文档全异步入库**：上传立即返回 `{ documentId, status: "pending" }`，解析/embedding/写库丢后台，前端轮询 `documents.status`（`pending`/`processing`/`ready`/`failed`）。
- **上传文件字节的暂存**：本期落地在服务端本地临时目录（单长驻进程本地磁盘，与"不引入新服务"一致），pg-boss 载荷只带**文件路径引用**而非字节本体；worker 取路径读文件、解析入库后删临时文件。不进对象存储、不把 buffer 塞进队列载荷。
- **SSE 中断止损**：前端 `AbortController.abort()` → 后端 `request.signal` → 透传取消上游 LLM `fetch`，停止计费。这条必须落地。
- **残答落库语义**：中断产生的半截回答**不写 `messages`**（残答无审计价值，且会污染历史）；仅完整生成的回答才 append 一条 assistant message。`grounded: false` 的常识推测答案**算一次正常作答、照常落 `messages`**，靠 message 上的 `grounded` 标记区分，不靠"写不写"区分。
- **流内错误**：首字节发出后（HTTP 200）的错误只能走 `event: error` 在流内传递，前端在已渲染内容后追加提示，不依赖 HTTP 状态码。

### 性能验收（关键项）

- `/chat` 首 token 到达 **≤ 3s (p95)**，用 TTFT 而非 LCP 度量（流式场景 LCP 会锚到生成结束，不适用）。
- `/chat` 「中断」按钮点击响应 ≤ 200ms（独立关键交互）；答案区只向下追加、CLS ≤ 0.1。
- 大数据量路由（`/history` 详情、`/admin`）必须分页/游标 + 长列表虚拟滚动。

### 埋点纪律

- **业务埋点 ≠ 审计日志 ≠ 性能监控，三者不进同一张表**。业务埋点只上报"能回答业务问题"的事件；技术中间态（query rewriting、embedding、检索、状态轮询）归 trace/日志；SSE 延迟、队列深度、内存水位归 APM。
- 管理员查看用户记录（`view_admin_conversations`）是全系统唯一必须审计到人的操作，必带 `admin_user_id` + `target_user_id`。
- 埋点上报失败不得阻塞主流程。

### 可调参数（`config/params.ts`，改动影响面）

`CHUNK_SIZE=500` / `CHUNK_OVERLAP=50`（**改动需全量重新解析+embedding+重建索引**，须在有数据入库前定稿）、`SCAN_TEXT_THRESHOLD=20`、`RETRIEVAL_TOP_K=5`、`GROUNDED_SIMILARITY_THRESHOLD=0.7`、`CONTEXT_WINDOW_ROUNDS=6`、`SESSION_TTL_MS=1800000`（会话内存空闲 30 分钟后可回收；本期靠请求时惰性剔除过期项，不起后台定时器）。分块策略是经验默认值、非最优解，待建立评测样例后回调。

### 开发前需拍板（阻塞相关模块）

注册开放度、首个管理员种子方式、具体 LLM/Embedding 厂商、在 Supabase 项目上启用 `vector` 扩展（向量方案前置地基，尽早开启）、管理员可见性告知的落地位置。详见 `architecture-design.md` §六 待确认项。
