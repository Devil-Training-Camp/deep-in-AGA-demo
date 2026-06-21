# docs/ —— 设计阶段产出目录

这个目录在 3.1 设计阶段开始时是空的。多轮需求讨论收敛后，由 Claude Code 整理产出两份文档：

- `requirements.md`——整体架构、各步骤的输入输出边界、场景类型定义、错误处理策略
- `technical-design.md`——技术选型依据、关键数据结构（如 Zod schema）、关键集成方式（如 Remotion Node API）

这两份文档是后续所有阶段的上下文来源：3.2 初始化时，`CLAUDE.md` 的核心内容直接来自这里。

> 完成的参考版本见 `demos/3-0-article-to-video/docs/`，演示前不要提前看，以免剧透设计结论。
