# 智能知识问答系统 后端实现路线图

> 版本：v1.0　｜　状态：待开发
>
> 输入：`architecture-design.md`（§四 API 接口契约、§六 模块边界与目录结构）+ `CLAUDE.md`（技术栈约束、模块红线、P0 安全项）
>
> 输出：按依赖顺序排列的接口与模块实现清单。每项标注**依赖类型**（DB / LLM / 无）、**先决条件**、**是否流式**。仅路线图，不含代码。

## 说明：源文件澄清

- 提示中提到的 `packages/shared/src/api/schema.yaml` **在本项目中不存在**——没有任何独立的 schema/yaml 文件。API 契约来自 `architecture-design.md` §四。
- 提示中的 `doc/architecture.md` 实际文件名为 `doc/architecture-design.md`。
- `architecture-design.md` §六 目录树里把 `lib/auth/` 描述为「JWT 签发/校验、密码哈希」，此为**已废弃的旧方案**。以决策 5 与 `CLAUDE.md` 为准：认证走 **Supabase Auth**。本路线图反映的是权威版本。

---

## 阶段 0 — 基础地基（无外部依赖，最先完成）

| # | 模块 | 依赖类型 | 先决条件 | 流式 |
|---|------|---------|---------|------|
| 0.1 | `config/params.ts` — 集中可调参数（`CHUNK_SIZE` 等 6 项 + `SESSION_TTL_MS`） | 无 | 无 | 否 |
| 0.2 | `lib/db/` — Drizzle schema + PG 连接 + migration（`CREATE EXTENSION vector`、5 张表、HNSW 索引、`vector(1024)` 列） | DB | 待确认项 4（先在 Supabase 启用 `vector` 扩展） | 否 |
| 0.3 | `lib/llm/` — 供应商抽象接口 `LLMProvider`（`streamChat`/`rewrite`）+ `EmbeddingProvider`（`embed` → 1024 维），含桩实现 | LLM | 具体厂商未定（待确认项 3）；接口先定，实现待拍板 | `streamChat` 是（`AsyncIterable<string>`） |
| 0.4 | `lib/auth/` — Supabase `createServerClient` 封装、`getUser()` 校验、从 `users` 表查 `role` | DB + Supabase Auth | 0.2（users 表） | 否 |

> **`lib/auth/` 红线**：授权走 `getUser()`（向服务端校验），不信任 `getSession()` 或客户端传入角色；`service_role key` 只存服务端 env、绝不进 bundle。

---

## 阶段 1 — 数据访问与核心能力（建立在地基之上）

| # | 模块 | 依赖类型 | 先决条件 | 流式 |
|---|------|---------|---------|------|
| 1.1 | `lib/db/` 数据访问层 — 三条相反授权规则的**统一注入点**：知识库不拼 user／历史强制拼 `user_id`／admin 路径刻意不拼 | DB | 0.2 | 否 |
| 1.2 | `lib/session/` — 进程内 `sessionId → 最近 N 轮` Map，惰性剔除过期项（`SESSION_TTL_MS`），**绝不读 `messages` 表** | 无 | 0.1 | 否 |
| 1.3 | `lib/rag/` 分块 — 500 字/重叠 50，段落（`\n\n`）或句号边界切分 | 无 | 0.1 | 否 |
| 1.4 | `lib/rag/` 向量检索 — 单 `knowledge_base_id` 内 `cosineDistance`（`<=>`）top-K + 相似度 | DB + LLM(embed) | 0.2, 0.3, 1.3 | 否 |
| 1.5 | `lib/rag/` query rewriting — 小模型把追问改写为独立问题再检索 | LLM(rewrite) | 0.3, 1.2 | 否 |
| 1.6 | `lib/ingestion/` 解析 — `pdf-parse`/`mammoth`/`fs` 逐格式独立 try/catch + 扫描件阈值判定（`SCAN_TEXT_THRESHOLD`） | 无 | 0.1 | 否 |
| 1.7 | `lib/ingestion/` pg-boss worker — 领任务→改状态→解析→分块→embedding→写 `doc_chunks`→删临时文件；载荷只带**文件路径引用** | DB + LLM(embed) | 0.2, 0.3, 1.3, 1.6；应用启动时 `boss.start()` | 否 |

---

## 阶段 2 — API 路由（装配层，依赖上面所有模块）

### 认证（无鉴权入口，其余接口全部依赖它）

| # | 接口 | 依赖类型 | 先决条件 | 流式 |
|---|------|---------|---------|------|
| 2.1 | `POST /api/auth/register` — 按注册开放度约束（待确认项 1），不得默认任意邮箱可注册 | Supabase Auth + DB | 0.4 | 否 |
| 2.2 | `POST /api/auth/login` — 按 IP/账号限失败次数 | Supabase Auth | 0.4 | 否 |

### 知识库（全员平权，不拼 user 过滤）

| # | 接口 | 依赖类型 | 先决条件 | 流式 |
|---|------|---------|---------|------|
| 2.3 | `GET /api/knowledge-bases` — 列全部 | DB | 1.1, 2.2 | 否 |
| 2.4 | `POST /api/knowledge-bases` — 创建 | DB | 1.1, 2.2 | 否 |
| 2.5 | `DELETE /api/knowledge-bases/:id` — 级联删；服务端记录操作者/时间/影响量 | DB | 1.1, 2.2 | 否 |

### 文档（全异步入库 + 状态轮询）

| # | 接口 | 依赖类型 | 先决条件 | 流式 |
|---|------|---------|---------|------|
| 2.6 | `POST /api/knowledge-bases/:id/documents` — 存临时文件→插 `pending`→投 pg-boss→立即返回 `{documentId, status:"pending"}` | DB + 队列 | 1.1, 1.7, 2.2 | 否 |
| 2.7 | `GET /api/documents/:id` — 轮询 `{status, error_reason?}` | DB | 1.1, 2.2 | 否 |
| 2.8 | `GET /api/knowledge-bases/:id/documents` — 列库内文档及状态 | DB | 1.1, 2.2 | 否 |
| 2.9 | `DELETE /api/documents/:id` — 删文档及 chunk；记录级联影响 | DB | 1.1, 2.2 | 否 |

### 问答（SSE，系统最复杂链路，几乎依赖全部核心模块）

| # | 接口 | 依赖类型 | 先决条件 | 流式 |
|---|------|---------|---------|------|
| 2.10 | `POST /api/chat` — `runtime="nodejs"` + `dynamic="force-dynamic"`；握手 `getUser()`、校验 `sessionId` 归属；取窗口→改写→检索→判 grounded 阈值→流式生成；`event: token/meta/done/error`；`request.signal` 透传取消上游 fetch；残答不落库、完整答案 append `messages`（`grounded=false` 也算正常作答、照常落库） | DB + LLM(stream + rewrite + embed) | 0.4, 1.1, 1.2, 1.4, 1.5, 2.2 | **是（SSE）** |

### 历史 & 管理后台

| # | 接口 | 依赖类型 | 先决条件 | 流式 |
|---|------|---------|---------|------|
| 2.11 | `GET /api/conversations` — 仅当前 `user_id`（数据层强制注入） | DB | 1.1, 2.2 | 否 |
| 2.12 | `GET /api/conversations/:id/messages` — 校验 `:id` 归属当前用户（防 IDOR），分页/游标 | DB | 1.1, 2.2 | 否 |
| 2.13 | `GET /api/admin/conversations` — `role === 'admin'`（禁 `role !== 'user'` 反向逻辑）；**刻意不拼 user 过滤**；必审计 `admin_user_id` + `target_user_id`；分页 | DB | 1.1, 2.2 | 否 |

---

## 关键路径小结

依赖收敛成一条主链：

```
0.1 params ─┐
0.2 db ─────┼─→ 1.1 数据访问层(三条授权规则) ─┐
0.3 llm ────┤                                  ├─→ 2.x 全部 API
0.4 auth ───┘                                  │
            └─→ 1.2~1.7 (session/rag/ingestion) ┘
                                     ↑
              2.10 /api/chat 是唯一流式接口，等 1.2 + 1.4 + 1.5 全齐才能装配
```

**上线阻断项（P0，随对应模块一起做，不能后补）**：三条相反授权规则统一在 1.1；`sessionId` 归属校验与 IDOR 防护在 2.10 / 2.12；admin 正向鉴权 + 审计在 2.13；密钥只进服务端 env 贯穿 0.3 / 0.4 / 2.x。

**动手前需先拍板**（否则阻塞对应模块）：待确认项 4（启用 pgvector）→ 阻塞 0.2；厂商（项 3）→ 阻塞 0.3 实现；注册开放度（项 1）→ 阻塞 2.1；首个管理员种子（项 2）→ 阻塞 2.13 的可测性。
