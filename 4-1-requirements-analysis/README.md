# 4-1 需求分析 Demo

课程 4.1「需求分析：驱动 AI 推演出可执行需求文档」的配套 demo。

贯穿案例是一个 AI 知识问答系统。本节不跑代码，目标是通过两个 Skill 驱动 AI 追问，产出一份只讲"做什么"、可驱动开发的 `requirements.md`。项目背景与需求约束见 `CLAUDE.md`。

## 需要的 Skill

本 demo 依赖两个社区 Skill，先安装：

```bash
# 需求追问：三阶段（发现 → 分析 → 起草）逼出边界并生成需求文档
npx skills add github/awesome-copilot@prd

# 需求评审：六维度打分，评估 requirements.md 质量
npx skills add dauquangthanh/hanoi-rainbow@requirement-review -g
```

## 使用方式

**路径 A · 从想法出发**——手头只有模糊想法时，用 `/prd` 逐步追问清楚：

```
/prd

我要构建一个 AI 知识问答系统：用户上传文档，然后对文档内容提问，
系统返回基于文档的回答。请一次只问一个问题。

追问范围严格限定在这四类：用户角色、带验收条件的功能列表、
边界声明（不做什么）、风险点。与这四类无关的问题不要问，
尤其不要追问技术实现细节。最终保存到 requirements.md。
```

**路径 B · 从 PRD 出发**——已有产品经理的 PRD 时，让 `/prd` 以审查者身份找问题再补全（不要直接整理）。把 PRD 内容粘贴进 Prompt，要求它先找出模糊表述、隐含依赖、缺失的验收条件，再通过追问补齐。

**评估质量**——文档生成后，用 `/requirement-review` 打分，拿报告回文档改对应位置，直到 ≥ 90%：

```
/requirement-review

请评估 requirements.md 的质量，输出各维度评分和需要修改的具体问题。
```

## 产出物

`requirements.md`——本 demo 的唯一产出，初始为空，由上述流程生成。
