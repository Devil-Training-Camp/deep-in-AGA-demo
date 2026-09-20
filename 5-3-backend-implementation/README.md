# 4-2 技术调研 Demo

课程 4.2「技术调研：把需求转化为可追溯的选型决策」的配套 demo。

贯穿案例仍是 AI 知识问答系统。本节不跑代码，输入是 4.1 产出的 `requirements.md`，目标是用 Perplexity 收集生态信息、用 Claude 结合项目约束推导，产出一份按决策点组织、每个决策都可追溯的 `tech-selection.md`。项目背景与技术约束见 `CLAUDE.md`。

## 需要的工具

本节用 Perplexity MCP Server 做生态信息收集——横向对比类查询上，它的 Sonar 会把多来源整合成结构化对比摘要，比内置 WebSearch（只返回一堆待整合的链接）更适配选型场景。

先到 [Perplexity 控制台](https://console.perplexity.ai) 申请 API Key，然后接入：

```bash
claude mcp add perplexity --env PERPLEXITY_API_KEY="your_key" -- npx -y @perplexity-ai/mcp-server
```

验证接入成功：

```bash
claude mcp list
```

看到列表里出现 `perplexity` 即可。本 demo 已在 `.mcp.json` 里配好该 Server（用 `${PERPLEXITY_API_KEY}` 环境变量占位，凭证不进 Git），也可直接设置环境变量后启动 Claude Code。

## 使用方式

**第一步 · 从需求提取决策点**——把 `requirements.md` 交给 Claude，让它提取需要明确决策的技术选型点，每个决策点绑定需求来源：

```
以下是我们项目的需求文档。请从技术架构角度分析，提取出需要做出明确决策的技术选型点，
每个决策点说明：
1. 需求里哪条功能或约束驱动了这个决策点
2. 这个决策点影响哪些技术层（前端 / 后端 / 存储 / 基础设施）
3. 主要的候选方案方向（不需要给出最终结论）

需求文档：
[粘贴 requirements.md 内容]
```

**第二步 · Perplexity 收集生态信息**——分两轮查询，第二轮务必带上项目约束。第一轮问生态全景，摸清有哪些选项：

```
2025 年主流向量数据库选型对比：pgvector、Chroma、Qdrant、Weaviate、Pinecone。
重点关注：开源 vs 托管、RAG 场景下的召回精度、与 Node 后端的集成方式。
```

第二轮带约束查，让回答针对本项目——好查询和差查询的差距，就在有没有把数据规模、团队、现有栈直接写进去：

```
对比 pgvector 和 Qdrant 在以下条件下的差异：
- 数据规模：10 万~50 万文档块，每块约 512 tokens
- 团队：单人运维，无专职 DBA，现有 PostgreSQL 实例
- 查询模式：语义相似度检索，P95 延迟要求 ≤ 500ms
对比维度：查询延迟、存储成本、与 PostgreSQL 的集成复杂度、水平扩展能力
```

**第三步 · Claude 带约束推导**——把 Perplexity 的对比信息和项目约束一起交给 Claude。约束是区分"可行"和"推荐"的关键：没有约束只能得到"各有场景"的模糊答案，有约束才能给带推导链的确定结论。项目约束见 `CLAUDE.md`，推导时要求 Claude 输出"推荐选择 + 在哪些条件变化时应重新评估"。

**第四步 · 整合成文档**——让 Claude 把各决策点整合成 `tech-selection.md`，按决策点组织（不按技术层），每个决策点含四要素：需求来源、候选方案对比、决策及理由、重新评估条件。

**第五步 · 对照检查**——别跳过这步。调研拉长后容易"忘了当初为什么做这个决策"，选出的方案技术上说得通却对不上需求：

```
请对照 requirements.md，逐条检查 tech-selection.md 里的技术决策：
1. requirements.md 里的每条功能需求和约束，是否都有对应的决策覆盖？
2. 有没有哪个决策和需求约束存在直接冲突？
3. 有没有需求条目在选型阶段被忽略，导致后续实现可能出问题？

输出格式：按需求条目逐条给出覆盖状态（已覆盖 / 未覆盖 / 存在冲突），有问题的条目说明原因。
```

## 产出物

- `requirements.md`：输入，来自 4.1，本节只读不改。
- `tech-selection.md`：本 demo 的产出，按决策点组织，每个决策都能追溯"为什么选""何时重评"。
