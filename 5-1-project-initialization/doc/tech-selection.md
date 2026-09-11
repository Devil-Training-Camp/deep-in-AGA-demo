# 智能知识问答系统 技术选型

> 版本：v1.0　｜　状态：技术调研完成，待评审
>
> 输入：`requirements.md`（v1.0，做什么）｜ 输出：本文档（怎么选，带约束推导链）
>
> 调研方法：每个决策点先用 Perplexity 收集 2026 年生态现状（成熟度、许可证、性能基准、社区实践），再落到本项目的六条约束上推导结论。文中标注来源的数据均来自真实 web 检索。

## 一、选型的锚点：六条约束

需求文档只回答"做什么"，而技术选型要在"怎么做"上给出确定的结论。让结论确定下来的不是方案本身有多先进，而是下面这组约束——**同一个方案，脱离约束只能得到"各有场景"的模糊答案，落到约束上才能推出"就选它"。**

| 约束 | 对选型的实际作用 |
|------|-----------------|
| 团队规模：1 名全栈，无专职 DBA/运维 | 每多一个需要独立部署、监控、排障的服务，都要这唯一的人来扛——运维复杂度是硬成本 |
| 现有基础设施：PostgreSQL 14（Railway 托管） | 已经在跑的东西复用成本为零；新增的东西从零起算 |
| 技术栈：Python + FastAPI 后端 | 方案的 Python/FastAPI 生态成熟度直接决定接入速度 |
| 用户规模：DAU < 500，文档 < 10 万块 | 规模小意味着大多数"高性能"方案的优势用不上，反而暴露其运维代价 |
| 运维偏好：减少独立服务数量 | 在"能力够用"的前提下，服务越少越好 |
| 预算：初期无预算用于付费托管服务 | 排除托管向量库这类固定订阅；但 LLM/Embedding 的按量调用费属必要成本，可接受 |

这六条里，反复起决定作用的是三条：**复用现有 PostgreSQL**、**减少独立服务**、**规模小到用不上重型方案**。后面几乎每个决策点的收敛，都能追溯到它们。

## 二、七个决策点

### 1. 前后端流式通信：SSE

**驱动需求**：功能 3「回答流式逐字输出，首字节延迟 ≤ 3s」，以及问答体验隐含的"用户可中途中断"。

**影响层**：前端（渲染与中断控制）、后端（接口设计、连接管理）、基础设施（反向代理的缓冲与超时）。

**候选对比**：

| 方案 | 与本场景的匹配 | 代价 |
|------|--------------|------|
| **SSE** | 完全匹配——"服务端推 token、客户端只读"正是 SSE 的形状；走纯 HTTP，透明穿过代理，无需 sticky session | 需关闭 Nginx 缓冲、设置心跳 |
| WebSocket | 双向能力在本项目无对应需求 | 握手开销、每连接内存约为 SSE 的 10–15 倍、需自管连接生命周期与重连——架构错配 |
| HTTP chunked | 方向匹配，但缺少 `EventSource` 的自动重连、`Last-Event-ID` 断点续传、事件类型区分 | 浏览器场景没理由舍 SSE 用它 |

**约束推导**：三大 LLM 厂商（OpenAI、Anthropic、Cohere）的流式 API 底层都是 SSE，它已是 2026 年 LLM token 流式的默认协议。落到本项目，决定性的是"减少运维"这条：SSE 走纯 HTTP，不需要 sticky session 或额外基础设施，而 WebSocket 要为一个本项目根本用不到的双向能力，换来连接状态管理和代理配置的持续负担。FastAPI 0.135.1 已原生内置 `EventSourceResponse`（自动处理 `text/event-stream`、`X-Accel-Buffering: no` 头和心跳），接入几乎零成本。

中断的实现是两个承重环节：前端用 `AbortController.abort()` 关闭连接，后端在生成循环里轮询 `await request.is_disconnected()`，为真时 `await stream.close()` 停止上游 LLM 计费——不这么做，用户中断了但后端还在烧钱。有一个必须落地的工程点：Nginx 默认 `proxy_buffering on` 会把 token 攒到缓冲满才转发，导致"逐字输出"变成"整段蹦出"，需在 location 块设 `proxy_buffering off` 并配合后端 `X-Accel-Buffering: no` 头。

> 来源：[SSE 流式与背压](https://tianpan.co/blog/2026-04-10-streaming-real-time-agent-uis-sse-backpressure-reconnection)、[FastAPI 官方 SSE 文档](https://fastapi.tiangolo.com/tutorial/server-sent-events/)、[断连取消 LLM 请求](https://www.dreaming.press/posts/how-to-cancel-an-llm-request-on-client-disconnect.html)、[Nginx SSE 缓冲配置](https://oneuptime.com/blog/post/2025-12-16-server-sent-events-nginx/view)

**结论**：选 SSE。适用边界——一旦未来引入需要客户端持续上行的实时协作（如 mid-stream steering），再重新评估 WebSocket。

---

### 2. 向量存储：pgvector

**驱动需求**：功能 3「基于所选知识库内容作答」需要语义检索。

**影响层**：后端（RAG 检索管道）、存储层、基础设施（是否新增独立服务）。

**候选对比**：

| 方案 | 成熟度（2026-08 核实） | 许可证 | 运维成本 | 免费性 | 10 万块性能 |
|------|---------------------|--------|---------|--------|------------|
| **pgvector** | 22.6k stars，公认 <10M 向量 production-ready | PostgreSQL License | 零新增服务，复用现有 PG | 完全免费 | HNSW p95 ≈ 1.5ms，富余极大 |
| Qdrant | 31.6k stars，Rust，benchmark 领先 | Apache 2.0 | 需独立服务部署/监控/备份 | 免费自托管 | 极强，但此规模用不上 |
| Chroma | 定位 prototyping，~10M comfortable | Apache 2.0 | 嵌入式零运维 / server 模式需独立进程 | 免费自托管 | 足够，生产可靠性弱于 Qdrant |
| Pinecone | 托管领导者，闭源 | 专有 SaaS | 零运维但引入外部依赖与厂商锁定 | **不可自托管**，超免费层即付费 | 充足 |

**约束推导**：这个决策点是约束收窄答案最典型的例子。四个方案在"能不能做 RAG 检索"上都合格，真正拉开差距的是本项目的规模和基础设施。

关键的一条工程事实是：**向量检索从来不是 RAG 的性能瓶颈**——检索耗时 5–20ms，而 embedding 是 100–300ms、LLM 推理是 500ms–3s。这意味着 Qdrant 相对 pgvector 的性能优势（都在毫秒级），在本项目 10 万块规模下完全被下游环节淹没，用户根本感知不到，却要为此多养一个需要独立部署、监控、备份的服务——对唯一的全栈开发是净负担。

pgvector 在 100k 向量下 HNSW p95 约 1.5ms（约 53x 优于顺序扫描），10 万块远在其舒适区。而它最大的优势是"零新增服务"：直接跑在已有的 PostgreSQL 14 实例里，复用现成的备份、监控、连接池。这一条正面命中"复用现有 PG"和"减少独立服务"两条约束。Pinecone 则同时撞上两堵墙——闭源不可自托管，且超出免费 Starter 层后最低跳到 $20/月，与"无预算"和"减少服务"都冲突。

> 来源：[pgvector 生产实践与失败案例](https://selfhost.dev/blog/pgvector-in-production-2026-critiques-failures/)、[向量库性能基准对比](https://culpur.net/2026/04/05/vector-database-performance-benchmarking-pgvector-qdrant-and-milvus-for-production-rag/)、[Pinecone 官方定价](https://www.pinecone.io/pricing/)、[2026 向量库选型框架](https://www.olostep.com/blog/best-vector-database)

**结论**：选 pgvector。适用边界——当单库向量量逼近千万级，或出现严重的读写热点，再评估拆分到 Qdrant。

---

### 3. 多知识库隔离：应用层字段过滤（可选叠加 RLS 兜底）

**驱动需求**：功能 1「不同知识库文档相互隔离」+「提问只在选定的单库内检索，不跨库」。

**影响层**：存储层（数据模型）、后端（检索过滤逻辑）。

**候选对比**：

| 方案 | 实现复杂度 | 运维负担 | 隔离强度 | 是否过度设计 |
|------|-----------|---------|---------|-------------|
| **应用层字段过滤** | 最低（共享表 + `knowledge_base_id` + btree 索引） | 最轻，单表单套迁移 | 最弱，靠代码保证不漏加过滤 | 否，本规模推荐起点 |
| PostgreSQL RLS | 中，需设计 policy、管理角色、测四类路径 | 偏重，policy 需持续 review，注意 owner/superuser 绕过 | 强，数据库层兜底 | 对本场景偏过度 |
| 独立 schema/collection | 最高，每库独立建表建索引 + 路由 | 最重，DDL/grant/版本漂移 | 最强，命名空间级 | 明显过度 |

**约束推导**：这里的关键判断是——**本项目的知识库边界是"产品边界"，不是"安全边界"**。RLS 和独立 schema 的价值在于"敌对、互不信任的租户"场景（多租户 SaaS），需要数据库层强制兜底；而本项目是同一应用内、单一可信代码库掌控所有访问路径的逻辑分区。对这种场景，经过良好测试的应用层过滤既更简单、也足够安全。

性能上，pgvector 的 metadata 过滤慢不慢取决于"过滤选择性"而非 WHERE 本身，且 0.8.0 的迭代索引扫描已缓解"过滤后候选不足"的老问题；本场景每库文档量不大，配 `knowledge_base_id` 的 btree 索引后完全够用。对 1 人无 DBA 的团队，RLS 的误配风险（忘开、policy 过宽、用了绕过角色）往往比它省下的那点代码更值得担心。

应用层过滤唯一的弱点是"某条查询忘拼 `knowledge_base_id` 就跨库"。作为低成本兜底，可以叠加一条**简单的** RLS policy（`knowledge_base_id = current_setting(...)`）在数据库层防漏网——简单谓词的 RLS 开销很小，能像手写 WHERE 一样走索引。

> 来源：[pgvector 0.8.0 迭代索引扫描](https://www.postgresql.org/about/news/pgvector-080-released-2952/)、[PostgreSQL RLS 官方文档](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)、[RLS 的局限与替代](https://www.bytebase.com/blog/postgres-row-level-security-limitations-and-alternatives/)、[AWS 多租户向量检索实践](https://aws.amazon.com/blogs/database/multi-tenant-vector-search-with-amazon-aurora-postgresql-and-amazon-bedrock-knowledge-bases/)

**结论**：以应用层 `knowledge_base_id` 过滤为主，可选叠加一条简单 RLS policy 兜底；独立 schema 暂不采用。适用边界——若某个库因合规需要单独备份/恢复，或体量严重失衡，再拆到独立 schema。

---

### 4. 文档解析：PyMuPDF + python-docx + 阈值判定（AGPL 需评估）

**驱动需求**：功能 2「支持含可提取文字的 PDF/Word/TXT」+「扫描件/图片型 PDF 在**上传环节即拦截**，不静默失败、不入库空内容」+「单份失败显示具体原因，不影响其他文档」。

**影响层**：后端（解析管道、错误分类）、存储层（解析状态字段）、前端（失败原因回显）。

**候选对比**：

| 方案 | 格式覆盖 | 许可证 | 依赖重量 | 错误分类能力 |
|------|---------|--------|---------|-------------|
| **PyMuPDF + python-docx + open()** | 三个专用库各覆盖一种格式 | **PyMuPDF 为 AGPL-3.0**（python-docx 为 MIT） | 轻，PyMuPDF wheel ≈ 20MB 自带 C 引擎，无系统依赖 | 强，逐格式独立 try/except 精确定位 |
| unstructured | 最全，一个 API 通吃 | Apache 2.0 | **重**，实测 146MB / 54 依赖，PDF 需 poppler/tesseract/libreoffice | 错误封装在框架内，定位不如专用库直接 |

**约束推导**：unstructured 的"一个 API 通吃多格式"看起来省事，但它的 146MB 体积、54 个依赖，以及一旦要解析 PDF 就绕不开的 poppler/tesseract/libreoffice 系统依赖，对"1 人全栈、低运维、减少服务"是明显拖累。PyMuPDF + python-docx 的专用库组合部署轻量，而且逐格式独立调用天然满足"单份失败显示具体原因、不影响其他文档"——每种格式各自 try/except，能精确定位是哪份、哪种格式、哪一步失败。

需求里"不静默失败"这条，恰好对应一个必须主动处理的坑：**所有纯文本解析库对扫描件都静默返回空串，不会抛异常**。也就是说，光靠"解析报错"抓不住图片型 PDF——它不报错，只是给你一个空字符串。主流实践是**提取后按文本量阈值判定**：用 PyMuPDF 逐页 `get_text("text").strip()` 累加字符数，低于阈值（常用 20 字符）就判为扫描件，在上传环节直接拦截返回"该文档无可提取文字，暂不支持"，不入库空内容。这套逻辑一行 `get_text` 即可实现，不需要引入 OCR，与"本期不做图片文字识别"的边界声明一致。

有一个必须在评审时拍板的风险：**PyMuPDF 是 AGPL-3.0**，商用需购买 Artifex 商业授权，否则触发 copyleft 开源义务。本项目是公司内部系统，需评估 AGPL 是否可接受；若不可接受，PDF 环节可替换为 pypdf（BSD）或 pdfplumber（MIT），代价是文本提取质量略降（pypdf 通过率 98.4% vs PyMuPDF 99.3%）。

> 来源：[Python PDF 库许可证与对比](https://pdfmux.com/blog/pymupdf-vs-pdfplumber/)、[unstructured 完整安装依赖](https://docs.unstructured.io/open-source/installation/full-installation)、[扫描件字符数阈值判定实践](https://document-data-automation.com/automating-pdf-extraction-generation/scanning-and-ocr-processing-with-python/)、[三大 PDF 库对比](https://subhajitbhar.com/blog/pdf-extraction/pdfplumber-vs-pymupdf-vs-pypdf2/)

**结论**：PyMuPDF + python-docx + 内置 open()，配文本量阈值判定实现上传期拦截。**待评审决策点**：AGPL 是否可接受，不可接受则 PDF 环节换 pypdf/pdfplumber。

---

### 5. 多轮对话上下文：进程内内存 + query rewriting

**驱动需求**：功能 4「结合前几轮理解指代，无需重复背景」+「上下文仅当前会话内有效，刷新/新开会话即清空」；边界声明「上下文不跨会话延续」。

**影响层**：后端（会话状态存储、指代消解策略）、存储层。

这个决策点拆成两个子决策：**上下文存哪里**和**怎么消解指代**。

**A. 上下文存储位置**：

| 方案 | "会话级、刷新即清"契合度 | 对本约束的适配 |
|------|------------------------|--------------|
| **进程内内存** | 最契合——进程重启/会话结束天然清空，无需写 TTL 或删除逻辑 | 零新增服务 |
| Redis | 能做（靠 TTL），但为"用完即弃"的会话状态多养一个服务 | 违背"减少服务"，且初期无预算 |
| 前端保存回传 | 契合（sessionStorage 刷新即清） | 零新增服务，但请求体膨胀、需信任前端传入 |

需求明确"上下文仅当前会话内有效、刷新即清、不跨会话"，这恰好**消解了持久化存储的唯一理由**。LLM 每次调用本身无状态，"记忆"是靠每轮把历史塞回 prompt 伪造出来的；既然不要求跨会话，就没必要为此引入 Redis。用 `session_id` 索引一个进程内的最近 N 轮滑动窗口即可，零新增服务，最省事。

**B. 指代消解策略**：

| 方案 | 检索准确性 | 代价 |
|------|-----------|------|
| 整段历史拼进 prompt | 差——直接拿含"它/这个"的原句去向量检索，检索的是无意义片段 | 无额外 LLM 调用 |
| **query rewriting（改写成独立问题）** | 好——"它的价格"还原为"Pro 套餐的价格"，检索命中率显著提升 | 多一次小模型调用（约 +0.75s） |

这里有个多轮 RAG 的经典陷阱：用户追问"它的价格是多少"，直接拿这句去向量检索，"它"是无意义的指代，检索必然不准。主流最佳实践是 **query rewriting（也叫 condense question）**：检索前先用一次小模型调用，结合对话历史把追问改写成独立完整的问题，再去检索。LangChain 把它列为对话式检索处理 follow-up 的标准做法，NVIDIA RAG Blueprint 明确标为"Recommended for Best Accuracy"。代价只是一次小模型调用（约 0.75s），对 1 人团队轻量可落地。

落地顺序上的提醒：**先上朴素 RAG，测出指代失败的 case，再针对性加 query rewriting**，不要一开始就堆全套 query transformation。

> 来源：[LangChain Query Transformations](https://www.langchain.com/blog/query-transformations)、[NVIDIA RAG 多轮对话文档](https://docs.nvidia.com/rag/2.6.0/multiturn.html)、[RAG query rewriting 教程](https://ai-tldr.dev/learn/rag/retrieval-and-reranking/query-rewriting-for-rag/)

**结论**：进程内内存存会话上下文 + query rewriting 消解指代。适用边界——若未来后端要多实例横向扩展（进程内内存会丢），再迁移到 Redis。

---

### 6. 历史记录存储：复用 PostgreSQL，分离体现在代码路径而非表结构

**驱动需求**：功能 5「保存提问历史供回顾」+「历史记录**仅用于展示**，不作为新提问上下文，与会话上下文相互独立」；功能 6 管理员「可查看所有用户完整问答记录」用于审计。

**影响层**：存储层（数据模型）、后端（读写路径）。

**数据模型**：业界高度收敛到一个标准范式——`conversations` + `messages` 两张表（一对多）。`conversations` 存会话容器的轻量元数据（`id`、`user_id`、`title`、`created_at`），`messages` 存每条问答（`conversation_id` FK、`role` CHECK 约束、`content`、`sequence_number` 显式排序、`created_at`）。索引是硬要求：`messages(conversation_id, sequence_number)` 和 `conversations(user_id, updated_at DESC)`。明确的反模式是把整个会话塞进单个 JSONB 列——搜索、审计都不方便。本项目 DAU<500 的规模，标准两表 + 索引足够，分区、缓存都是过度设计。

**关键洞察——分离不靠表结构，靠代码路径**：需求反复强调"历史记录"和"会话上下文"相互独立，很容易误以为要设计两套存储或加个 `use_as_context` 标志位。但正确的理解是：**LLM 无状态，"喂给下一轮的上下文"和"存下来的历史"本就是两件由应用层分别控制的事**。工程上的干净切分是一句话——**全量持久化，但只把你希望模型知道的那部分放进 prompt**。

落到本项目：一张 append-only 的 `messages` 表承载全部历史，服务于 UI 展示和管理员审计；而"历史不作为上下文"不是靠表里加字段实现的，是靠**上下文层（决策点 5 的进程内窗口）压根不去查这张历史表**实现的。分离体现在代码路径上，比"同表加标志位"更简洁、更不易出错。这样也回答了决策点 5 和 6 为什么被需求刻意拆开——它们服务两条完全不同的读路径。

**审计维度**：业界更严的做法（prompt/response 单独放访问受控存储、内容与元数据分层）对本项目偏重，可只采纳低成本的部分——`messages` 表 append-only 不做物理删除、管理员查询走独立只读权限，即可满足"管理员查看完整问答记录用于审计"。这里需呼应需求风险点：**上线前必须明确告知用户"问答记录对管理员可见"**。

> 来源：[AI 聊天历史存储建模](https://dialoguedb.com/blog/how-to-store-ai-chat-history)、[PostgreSQL 会话表结构讨论](https://stackoverflow.com/questions/52662334/postgresql-database-structure-for-chat-conversation)、[LLM 上下文窗口机制](https://tomarcher.io/posts/how-large-language-models-handle-context-windows/)、[AI 对话审计实践](https://anomity.ai/blog/auditing-ai-chat-interactions/)

**结论**：复用现有 PostgreSQL 14，`conversations` + `messages` 两表存全量历史；"历史不作为上下文"通过上下文层不读该表落地，无需第二套模型。

---

### 7. LLM 与 Embedding 接入：都走云 API，Embedding 选 1024 维档

**驱动需求**：功能 3「智能问答、流式输出、首字节延迟 ≤3s」需要 LLM；决策点 2 的语义检索需要 embedding 模型。

**影响层**：后端（模型调用层、流式适配）、基础设施（是否自托管、GPU 成本）。

**A. LLM 接入（自托管 vs 云 API）**：

流式和 ≤3s 首字节延迟这两条需求，其实**不构成选型约束**——主流云 API（OpenAI、Anthropic、Google、Mistral、DeepSeek）全部通过 SSE 提供流式输出，且面向对话的模型 TTFT 普遍在 200–900ms，远优于 3s 门槛（需避开 o1 这类推理模型，其 TTFT 可达 2–8s）。

真正决定选型的是成本结构。多份 2026 TCO 分析结论一致：**自托管的经济性拐点在约 500 万 tokens/天**，低于此云 API 几乎总是更便宜。原因是自托管有无法"闲时归零"的固定成本——7–8B 模型需租 GPU 约 $500–720/月 24/7，加上隐性的 0.3–0.5 FTE MLOps 运维，全成本是裸 GPU 价格的 3–5 倍。本项目 DAU<500，调用量远低于拐点；而"1 人无专职运维"直接排除了 MLOps 投入的可行性。自托管在这里会引入一个需要 GPU 和运维的独立服务，与"减少独立服务、减少运维"正面冲突。

**B. Embedding 模型（维度、价格）**：

embedding 的自托管/云 API 权衡与 LLM **不同，需分开判断**——embedding 模型小得多（BGE-M3 约 568M 参数，FP16 仅需 2GB VRAM，甚至可纯 CPU 运行），不构成"必须租 GPU"的负担。但即便如此，自托管仍会给 1 人团队引入一个需自己部署维护的推理服务；而云 embedding API 极便宜（约 $0.13/1M tokens，10 万块建库一次性成本几美元），零运维更契合约束。

**C. 与向量存储的联动（硬约束）**：这是决策点 2 和 7 必须绑定拍板的地方。**pgvector 标准 `vector` 类型的 HNSW/IVFFlat 索引有 2000 维上限**（根源是 PostgreSQL 8KB 页大小）。这直接反向约束 embedding 选型：

- OpenAI text-embedding-3-large **默认 3072 维会触发索引报错**，必须用 `dimensions` 参数降到 ≤2000（如 1024，官方称仅比 3072 差 1–2%），或改用 `halfvec(3072)` 类型（建表复杂度上升）。
- Voyage-3.5、Cohere embed-v4、BGE-M3 **天然 1024 维**，直接用 `vector(1024)` 建 HNSW 索引，无需任何 workaround。

因此"选 1024 维档的 embedding"能让 pgvector 建表走最简单路径：

```sql
CREATE TABLE doc_chunks (
    id bigserial PRIMARY KEY,
    knowledge_base_id bigint NOT NULL,
    text text NOT NULL,
    embedding vector(1024) NOT NULL
);
CREATE INDEX ON doc_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX ON doc_chunks (knowledge_base_id);
```

> 来源：[LLM API 延迟基准](https://kickllm.com/research/ai-api-latency-comparison.html)、[自托管 vs 云 API TCO 分析](https://tokspan.com/blog/cloud-api-vs-self-hosting-llms-the-complete-tco-analysis-2026/)、[Embedding 模型对比](https://ofox.ai/blog/embedding-api-rag-complete-guide-2026/)、[pgvector 维度上限与 halfvec](https://github.com/pgvector/pgvector)

**结论**：LLM 选低 TTFT 的成本敏感档（如 Gemini Flash / Claude Haiku），Embedding 选 1024 维档（text-embedding-3-large 降到 1024，或 Voyage/Cohere 原生 1024），均走云 API。适用边界——若后续为进一步减少外部依赖而希望 embedding 也不依赖 API，BGE-M3（1024 维、可 CPU 运行、MIT 许可）是唯一能在无 GPU、无付费前提下自托管的现实备选。

## 三、选型总览

| 决策点 | 结论 | 决定性约束 |
|--------|------|-----------|
| 1 流式通信 | SSE | 减少运维（纯 HTTP 无 sticky session） |
| 2 向量存储 | pgvector | 复用现有 PG + 规模小到用不上重型方案 |
| 3 数据隔离 | 应用层字段过滤（可选 RLS 兜底） | 产品边界非安全边界 + 1 人低运维 |
| 4 文档解析 | PyMuPDF + python-docx（AGPL 待评审） | 依赖轻 + 精确错误分类 |
| 5 上下文管理 | 进程内内存 + query rewriting | 会话级刷新即清消解了持久化理由 |
| 6 历史记录 | 复用 PostgreSQL 两表，分离靠代码路径 | 复用现有 PG |
| 7 模型接入 | LLM/Embedding 均云 API，1024 维 | 规模低于自托管拐点 + 减少服务 |

**决策点之间的两处强耦合**，评审时需一起看：

- **决策点 2 与 7 绑定**：embedding 的维度决定 pgvector 能否直接建索引。选 1024 维档，建表走最简单路径；选 3072 维需 `halfvec` 变通。这两个点不能各自独立拍板。
- **决策点 5 与 6 是需求刻意拆开的两条读路径**：会话上下文（进程内、刷新即清）和历史记录（PG 持久化、供审计）服务完全不同的目的。分离体现在"上下文层不读历史表"这条代码路径上，而非表结构。

**一条贯穿始终的推导逻辑**：七个决策点的收敛几乎都指向同一个方向——**把复杂度留在已有的 PostgreSQL 里，把不确定性外包给按量付费的云 API，尽量不引入需要独立运维的新服务**。这不是因为这些方案本身最先进，而是因为在"1 人全栈、无预算、规模小"这组约束下，运维复杂度和固定成本才是真正的稀缺资源。规模上来、团队变大后，这些结论都该重新评估——这正是选型结论有边界的含义。

## 四、待评审确认项

1. **PyMuPDF 的 AGPL-3.0 许可**是否可接受（决策点 4）——不可接受则 PDF 环节换 pypdf/pdfplumber。
2. **上线前告知用户"问答记录对管理员可见"**（决策点 6，呼应需求风险点）——这是产品/合规动作，需在首版上线前完成。
3. **具体 LLM/Embedding 厂商**的最终选择（决策点 7）——受公司内部可用的 API 渠道、数据合规要求影响，需结合实际可用性拍定。
