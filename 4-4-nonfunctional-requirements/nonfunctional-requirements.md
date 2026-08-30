# 智能知识问答系统 非功能性需求

> 版本：v1.0　｜　状态：待评审
>
> 输入：`requirements.md`（做什么）+ `architecture-design.md`（怎么落地）
>
> 输出：本文档——把散落在需求与架构里的隐含约束显式化为可度量、可验收的非功能性需求，覆盖**可观测性（埋点）/ 性能 / 安全**三个方向。
>
> 每条约束按四段组织：**来源**（追溯到哪条需求或决策）、**约束**（可量化表述）、**度量**（用什么验证）、**降级**（不满足时的兜底）。优先级：**P0** 上线必须满足 / **P1** 上线后尽快 / **P2** 迭代改进。

## 一、可观测性约束（埋点）

判断标准贯穿本节：一个事件缺失，是否导致某个业务问题无法回答？只埋能回答业务问题的事件；技术中间态归日志、可靠性指标归监控，不进业务埋点（三者边界见本节末）。

### P0：提问行为可分析（`ask_question`）

- 来源：`requirements.md` §功能 3「智能问答」、§功能 4「多轮对话」。
- 约束：每次提问上报 `ask_question`，必带属性 `user_id`、`knowledge_base_id`、`session_id`、`is_follow_up`（是否多轮追问）、`question_length`。
- 度量：埋点校验用例断言事件在提问提交时触发且属性齐全；数据侧用一天真实数据核对追问率（`is_follow_up=true` 占比）可算出。
- 降级：埋点上报失败不得阻塞问答主流程，异步补发或丢弃，不影响用户拿到答案。

### P0：答案依据状态可观测（`answer_grounded_shown`）

- 来源：`requirements.md` §功能 3「检索不到时如实说明」；`architecture-design.md` §API 契约 SSE `event: meta {grounded}`、可调参数 `GROUNDED_SIMILARITY_THRESHOLD=0.7`。
- 约束：每次作答上报 `answer_grounded_shown`，必带 `grounded`（true 有文档依据 / false 转常识推测）、`knowledge_base_id`、`top_similarity`（最高相似度分值）。
- 度量：分析 `grounded=false` 占比作为「知识库覆盖缺口」度量；按 `knowledge_base_id` 分组定位低命中库；用 `top_similarity` 分布回归验证阈值 0.7 是否合理。
- 降级：无。该事件缺失将导致「知识库够不够用」无法回答，属硬需求。

### P1：答案采纳信号（`answer_copied` / `answer_feedback`）

- 来源：`requirements.md` §风险点「准确缺少统一评判标准」。
- 约束：用户复制答案或点赞/点踩时上报，必带 `conversation_id`、`message_id`、`grounded`（该答案当时是否有依据）。
- 度量：对比 `grounded=true` 与 `grounded=false` 的采纳率，作为无 ground truth 情况下逼近「答得准不准」的代理指标。
- 降级：本事件依赖产品先新增「复制 / 反馈」UI 动作（`requirements.md` 未描述此交互）。UI 未就位前该事件无处触发，需先向产品确认交互，故定 P1 而非 P0。

### P1：文档上传与入库失败可归因（`upload_document` / `document_ingest_failed`）

- 来源：`requirements.md` §功能 2「解析失败明确告知原因、不静默失败」；`architecture-design.md` 决策 2/9/10（全异步入库、`status`/`error_reason` 字段）。
- 约束：上传上报 `upload_document`（`user_id`、`knowledge_base_id`、`file_type`、`file_size`）；入库失败上报 `document_ingest_failed`，`fail_reason` **必须可区分** `scanned_no_text`（扫描件拦截，产品边界内的正常拒绝）/ `parse_error`（解析失败，真异常）/ `unsupported_format`。
- 度量：按 `fail_reason` 分组统计——`scanned_no_text` 高说明产品边界与用户需求错位（该评估 OCR），`parse_error` 高说明功能真出问题。合成单一「失败率」即视为不满足本约束。
- 降级：上报失败不阻塞入库任务，走后台补发。

### P0：管理员审计行为可追溯（`view_admin_conversations`）

- 来源：`requirements.md` §风险点「隐私与审计的张力」、§功能 6「问答记录对管理员可见」；`architecture-design.md` 决策 8（管理员全局只读路径）。
- 约束：管理员每次查看用户问答记录上报，必带 `admin_user_id`、`target_user_id`（被查看者）、`accessed_count`。这是全系统唯一必须审计到人的操作。
- 度量：隐私投诉时能回溯「哪个 admin、何时、看过哪个用户的记录」；监控异常高频访问。
- 降级：无。审计者不被审计则隐私风险成黑箱，属合规硬缺口。

### P2：注册来源可监测（`register_user`）

- 来源：`requirements.md` §边界「只面向内部员工」；`architecture-design.md` 待确认项 1（注册开放度未定）。
- 约束：注册上报 `register_user`，带 `email_domain`（**只存域名，不存完整邮箱**）、`is_first_admin`。
- 度量：监测是否出现非公司域名注册（内部系统边界是否被突破）；观察用户规模增长曲线。
- 降级：无。

### 明确不打业务埋点的操作

以下缺失不导致任何业务问题无法回答，归入日志或监控，**不进业务埋点表**：

- **query rewriting、embedding、向量检索**：问答链路技术中间态，业务只关心最终答得好不好（已由 `answer_grounded_shown` + 采纳信号覆盖）→ 归**链路 trace/日志**。
- **文档状态轮询 `GET /api/documents/:id`**：决策 2 全异步入库的实现细节，最终成败已被 `upload_document`/`document_ingest_failed` 覆盖。
- **创建/切换/删除知识库**：切换是纯前端选择（`knowledge_base_id` 已挂在 `ask_question` 上）；创建/删除的存量可直接查表。其中**删库追责属审计诉求**（见安全 §审计），归后端操作日志，非业务埋点。
- **`login`**：成功/失败、暴力破解检测属**安全监控**；DAU 可由 `ask_question` 的 `user_id` 去重得到。
- **SSE 连接、首字节延迟、进程重启、队列深度、内存水位**：可靠性与性能指标，归 **APM/监控**（见性能 §）。

> 边界提示：**业务埋点 ≠ 审计日志 ≠ 性能监控**。三者混进一张表是这类系统埋点设计最常见的返工点。

## 二、性能约束

题目给的 Web Vitals Good 阈值（LCP ≤2.5s / INP ≤200ms / CLS ≤0.1）是**通用及格线**，不是目标值。逐路由推导的意义在于：按渲染方式和数据复杂度判断该路由应比及格线更严、原样沿用、还是需要改写。

### P0：问答首字节延迟（`/chat`）

- 来源：`requirements.md` §功能 3「流式输出，首字节延迟不超过 3 秒」；`architecture-design.md` 决策 1（SSE `force-dynamic`）、决策 4/5B（进程内上下文 + query rewriting）。
- 约束：用户提交问题后，SSE 第一个 token 到达浏览器 ≤ 3s（p95）。该路由**弃用传统 LCP**——流式答案让「最大内容块」持续增长，LCP 会锚定到生成结束（云 LLM 时长，前端不可控），改用**首 token 时间 TTFT** 对齐需求硬指标。
- 度量：用 Playwright 录制问答流程，从点击发送到收到第一个字符的时间间隔，p95 ≤ 3s。
- 降级：若上游云 LLM 响应 >5s，展示「正在思考」提示而非空白等待；触发 `event: error` 时在已渲染内容后追加提示（`architecture-design.md` §流内错误契约）。

### P1：问答页交互延迟分层（`/chat` INP）

- 来源：`architecture-design.md` 决策 1（SSE 逐 token 追加 DOM）、§功能 3 中断契约。
- 约束：流式生成期间普通交互（滚动、hover）INP ≤ 500ms（放宽，因主线程被高频 token 渲染占用，硬卡 200ms 会逼出过度节流反伤实时体感）；但**「中断」按钮作为独立关键交互必须 ≤ 200ms**——它触发止损（取消上游 fetch、停止计费），必须灵敏。
- 度量：用 Playwright / Web Vitals 库分别采集流式期间普通交互与中断点击的 INP，分位统计。
- 降级：中断响应超标时，前端先本地停止渲染并给出「已停止」反馈，异步确认后端取消结果。

### P1：问答页布局稳定性（`/chat` CLS）

- 来源：`architecture-design.md` 决策 1（答案逐 token 追加）。
- 约束：答案区流式追加时 CLS ≤ 0.1——答案只向下追加、不顶动已渲染内容（读着跳行体验极差，此处 CLS 是硬指标而非可放宽项）。
- 度量：Web Vitals 库采集 `/chat` 真实 CLS，p75 ≤ 0.1。
- 降级：无。

### P1：认证页加载（`/login`、`/register`）

- 来源：`architecture-design.md` §API 契约（登录/注册是唯二无鉴权入口，无服务端数据依赖）。
- 约束：静态预渲染。LCP ≤ 1.2s、INP ≤ 100ms（**比通用线更严**——无数据往返，>100ms 输入延迟即暴露 bundle/水合问题）。
- 度量：Lighthouse 实验室指标 + 真实用户 Web Vitals，LCP p75 ≤ 1.2s。
- 降级：无。

### P1：列表类路由加载（`/`、`/kb/:id`、`/history` 列表）

- 来源：`architecture-design.md` §API 契约（知识库/文档/历史列表查询，SSR 首屏）；数据模型索引 `conversations(user_id, updated_at DESC)`。
- 约束：SSR 首屏 LCP ≤ 2.0s（**比通用线略严**——单表读取、无向量运算无 LLM，不该用满 2.5s 预算），INP ≤ 200ms（普通导航/表单交互，沿用通用线）。
- 度量：真实用户 Web Vitals 按路由分组，LCP p75 ≤ 2.0s。
- 降级：列表查询慢时先渲染骨架屏，避免空白。

### P1：文档列表轮询布局稳定（`/kb/:id` CLS）

- 来源：`architecture-design.md` 决策 2（全异步入库，前端轮询 `status`：`pending`→`processing`→`ready`/`failed`）。
- 约束：轮询刷新状态时 CLS ≤ 0.1——状态标签（尤其 `failed` 展开 `error_reason`）尺寸变化不得引起列表跳动。这是该路由的主要风险（通用阈值只报 LCP/INP 时易漏）。
- 度量：Playwright 模拟状态流转录制布局偏移；真实 CLS p75 ≤ 0.1。
- 降级：为状态标签预留固定高度，`error_reason` 折叠展示。

### P2：大数据量路由（`/history` 详情、`/admin`）

- 来源：`architecture-design.md` 决策 6（`messages` append-only 永不删除，单会话可能很长）、决策 8（admin 全局无 `user_id` 过滤，数据量随全站增长）。
- 约束：LCP ≤ 2.5s（**原样沿用通用线**——数据复杂度随时间增长，压到 2.0s 不现实，留满预算是诚实的）。真正约束落在**必须分页/游标 + 长列表虚拟滚动**以守住 INP ≤ 200ms。
- 度量：造长会话/大数据量样本，验证分页生效、虚拟滚动下 INP 达标。
- 降级：无分页即视为不满足。
- 备注：`/admin` 性能瓶颈不在前端渲染而在后端——无过滤全局查询用不上 `(user_id, updated_at)` 索引，该问题归后端查询设计，非前端预算能解。

> 边界提示：首字节延迟、SSE 连接、进程重启、队列深度、内存水位等是**性能/可靠性指标**，进 APM/监控（p50/p95/p99 分位），不塞进业务埋点属性。

## 三、安全约束

真正的安全边界不在「要不要 JWT」，而在 JWT 通过后的**授权分层**：知识库全员平权、历史强制拼 `user_id`、管理员刻意不拼——三条相反规则在数据访问层交织，是越权风险最密集处。

### 接口鉴权

#### P0：SSE 端点鉴权与 sessionId 归属校验（`/api/chat`）

- 来源：`architecture-design.md` 决策 1（SSE 长连接）、决策 4（`session_id` 索引进程内 Map，**未说明如何与登录用户绑定**——架构明确空白）。
- 约束：SSE 连接建立时必须验证 JWT，连接建立后不再接受 token 更新（长连接鉴权仅在握手时发生一次）；请求体 `sessionId` 必须校验归属当前 `user_id`，不得使用他人 sessionId。
- 度量：集成测试——不带 token 的 SSE 连接必须返回 401；用户 A 传入用户 B 的 `sessionId` 必须被拒绝或隔离，不得读到 B 的上下文。
- 降级：无。sessionId 不校验归属将导致跨用户上下文泄漏，且进程内数据泄漏不留痕迹，无法事后追溯。

#### P0：历史记录强制用户隔离（`/api/conversations[/:id/messages]`）

- 来源：`architecture-design.md` 决策 7（历史查询强制拼 `WHERE user_id`，自己点名的越权风险）。
- 约束：所有历史查询在数据访问层统一注入 `WHERE user_id = :currentUser`；`/api/conversations/:id/messages` 必须校验 `:id` 归属当前用户，防 IDOR。
- 度量：集成测试——用户 A 请求列表不得返回 B 的会话；A 改 URL 里的 `:id` 访问 B 的会话必须返回 403/404。
- 降级：无。漏拼 `user_id` 等于把 admin 级可见性泄给普通用户。

#### P0：管理员审计路径鉴权（`/api/admin/*`）

- 来源：`architecture-design.md` 决策 8（管理员全局只读，**不拼** `user_id`）。
- 约束：`/api/admin/*` 必须校验 JWT claim `role === 'admin'`；这是全系统唯一全量数据出口，鉴权判断不得有反向逻辑漏洞（如误用 `role !== 'user'`）。
- 度量：集成测试——普通用户 token 请求 `/api/admin/conversations` 必须 401/403；伪造/无效 token 必须被拒。
- 降级：无。判断写反等于全库问答对所有人敞开。

#### P0：认证入口限流（`/api/auth/login`、`/api/auth/register`）

- 来源：`architecture-design.md` 决策 5（自建账号）、决策 1（单实例无冗余）、待确认项 1（注册开放度）；`requirements.md` §边界「只面向内部员工」。
- 约束：唯二无鉴权入口须限流。`login` 按 IP/账号限失败次数（如 5 次/分钟）；`register` 按待确认项 1 拍板的开放度（限公司邮箱域名 / 邀请制）约束，不得默认任意邮箱可注册。
- 度量：集成测试——超频登录返回 429；非白名单域名注册被拒。
- 降级：疑似爆破时临时锁定账号并记安全日志告警。

#### P1：破坏性操作的授权与追责（知识库/文档删除）

- 来源：`architecture-design.md` 决策 6（全员平权）、数据模型（`knowledge_bases` **无 owner/操作者字段**，二次确认仅在前端）、§级联删除（`ON DELETE CASCADE`）。
- 约束：`DELETE /api/knowledge-bases/:id`、`DELETE /api/documents/:id` 服务端须独立记录操作者、时间、级联影响量（前端二次确认不构成后端防护）。
- 度量：审计日志检查——每次删除可追溯到操作者 `user_id`、删除的 documents/chunks 数量。
- 降级：无操作者记录即视为不满足；追责能力缺失是全员平权的固有隐患。

### 数据脱敏

#### P0：敏感字段绝不外泄（`password_hash` / JWT payload）

- 来源：`architecture-design.md` 决策 5（`users.password_hash`、JWT `role`/`user_id` claim）。
- 约束：任何 API 响应、日志、错误堆栈**绝不含** `password_hash`（SELECT 层排除，禁 `SELECT *`）；JWT payload 为 base64 非加密，除 `role`/`user_id` 外不得放敏感信息；token 建议存 httpOnly cookie 而非 localStorage。
- 度量：契约测试扫描所有响应体不含 `password_hash`；代码审查确认查询不用 `SELECT *`、JWT 不含额外敏感 claim。
- 降级：无。

#### P1：问答内容与 PII 脱敏（`messages.content` / `users.email`）

- 来源：`requirements.md` §风险点「员工可能在提问中涉及个人或敏感业务信息」；`architecture-design.md` 决策 6（`messages` append-only 永不物理删除、对管理员全局可见）。
- 约束：`messages.content` **禁止进入排障日志**（日志访问控制弱于 DB，会放大泄漏面）；日志/埋点需用邮箱时降级为 `email_domain`，不打印完整邮箱。
- 度量：日志采样审查不含 `messages.content` 全文与完整邮箱；secret/PII 扫描接入 CI。
- 降级：需打印时仅记 `message_id` 引用，不落内容。

#### P2：全员共享库的敏感文档访问边界

- 来源：`architecture-design.md` 决策 6（知识库全员平权、无库级权限、无分级访问）。
- 约束：上传界面须提示「文档将对全员可见」，避免误传敏感文档到全员库；本期无分级访问，此约束靠告知而非技术管控。
- 度量：产品走查确认上传前有可见性告知（呼应待确认项 5 的落地位置）。
- 降级：本期以告知兜底，分级访问留待 P2 迭代。

### 密钥保护

#### P0：JWT 签名密钥保护（全系统信任根）

- 来源：`architecture-design.md` 决策 5（「JWT 签名密钥进环境变量」）、`lib/auth/`。
- 约束：签名密钥只存服务端环境变量，绝不硬编码进仓库；泄漏可伪造任意 JWT（含 `role: admin`）。
- 度量：secret 扫描（如 gitleaks）接入 CI 阻断密钥入库；审查确认密钥来自环境变量。
- 降级：无。密钥泄漏即系统级攻破，影响全系统而非单用户。

#### P0：外部服务凭证保护（云 LLM/Embedding API 密钥、PG 连接串）

- 来源：`architecture-design.md` 决策 3（Railway PG，pg-boss 与业务共库）、决策 7 + §供应商抽象层（云 LLM/Embedding API，厂商未定，待确认项 3）、`lib/llm/`、`lib/db/`。
- 约束：云 API 密钥与 PG 连接串只存服务端环境变量，**绝不进前端 bundle**（禁止误用 `NEXT_PUBLIC_` 前缀）、不进日志、不进错误响应。上游报错时错误日志不得包含含密钥的请求头。
- 度量：构建产物扫描确认前端 bundle 不含密钥；secret 扫描覆盖代码与日志；集成测试确认错误响应不透传上游密钥。
- 降级：无。云 API 密钥泄漏叠加单实例无限流是双重烧钱风险；PG 连接串泄漏可绕过全部 API 鉴权直取全库明文。

#### P1：首个管理员种子凭证

- 来源：`architecture-design.md` 决策 5、待确认项 2（首个管理员靠 seed 脚本 / 环境变量指定）。
- 约束：seed 脚本不得硬编码初始 admin 密码并提交仓库；首个管理员经环境变量指定或首次登录强制改密。
- 度量：代码审查 + secret 扫描确认 seed 不含明文初始密码。
- 降级：无。

## 四、评审重点

本文档把三类非功能性约束落到可度量、可验收的条目。评审时建议优先看三处：

1. **P0 清单是否是真正的上线阻断项**——尤其安全侧四条鉴权（SSE/历史/admin/认证限流）与两把系统级密钥（JWT 签名、PG 连接串），任一不满足都是全局风险。
2. **依赖产品/待确认项的条目**——`answer_copied`（需新增反馈 UI）、`register_user`（依赖注册开放度待确认项 1）、敏感文档告知（待确认项 5），需产品先拍板才能落地。
3. **`/chat` 路由的性能目标改写**——弃用 LCP 改 TTFT、INP 分层（中断按钮独立锁 200ms），这是通用 Web Vitals 在流式场景不适用的核心案例，需确认度量方式可执行。
