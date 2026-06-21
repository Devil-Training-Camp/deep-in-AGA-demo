# 3-1 文章转视频 Pipeline（第 3 章贯穿案例 · 现场演示工程）

第 3 章的贯穿案例工程，从 **3.1 设计阶段**开始。配套讲义见 [`handout/3-cc-driven-development/3-1-design-phase-handout.md`](../../handout/3-cc-driven-development/3-1-design-phase-handout.md)。

案例目标：输入一篇技术文章（Markdown），经人工确认分镜脚本后，自动输出一个可发布的视频。

## 当前状态：空脚手架

这是一个**故意留空**的起点，用来现场演示设计阶段的多轮对话。整个工程会随章节推进逐步长出内容：

| 阶段 | 在本工程里发生什么 |
|------|--------------------|
| 3.1 设计 | 多轮对话推进需求 → 产出 `docs/requirements.md`、`docs/technical-design.md` |
| 3.2 初始化 | 基于设计文档写 `CLAUDE.md`，让 CC 读懂项目 |
| 3.3 编码 | 落地 `src/`、`/gen-script` Skill，安装依赖 |
| 3.4~3.6 | 调试、自举循环、复盘 |

## 现在有什么

```
3-1-article-to-video/
├── .claude/CLAUDE.md   # 项目背景 + 设计阶段协作约定（刻意保持精简）
├── docs/               # 设计阶段产出目录（开始时为空）
├── package.json        # 工作区包，脚本待编码阶段补全
├── .gitignore
└── README.md
```

## 怎么开始演示

在本目录打开 Claude Code，按讲义把四轮 Prompt 依次发给 CC：开放探索 → 决策推演 → 细节确认 → 边界推演，最后让它把结论整理进 `docs/`。

> 已完成的参考实现见 [`demos/3-0-article-to-video`](../3-0-article-to-video)（含完整 `src/` 与最终 `docs/`）。演示前别提前翻，避免剧透设计结论。
