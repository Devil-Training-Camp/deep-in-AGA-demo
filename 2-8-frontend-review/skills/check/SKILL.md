---
name: check
description: 执行前端代码审查,依次调度 typescript-analyzer 与 accessibility-checker 两个 subagent,汇总类型安全与无障碍问题。当用户想整体审查前端代码(TS/TSX)质量时使用。
argument-hint: "[审查范围,如 src/ 或某个文件路径]"
allowed-tools: "Task Read Grep Glob"
---

调用方式:`/frontend-review:check src/` 或 `/frontend-review:check src/App.tsx`。

审查范围:`$ARGUMENTS`(未指定时默认审查 `src/` 下的 `.ts`/`.tsx` 文件)。

按以下顺序执行,**不要并行**,后一步依赖前一步的产出汇总:

1. 用 Task 工具调起 `typescript-analyzer` subagent,传入审查范围,要求它返回所有 any 滥用与缺失类型注解的问题清单(文件:行号 + 修复建议)。
2. 在第 1 步返回后,再用 Task 工具调起 `accessibility-checker` subagent,传入相同范围,要求它返回所有违反 WCAG 2.1 的无障碍问题清单(文件:行号 + 修复建议)。
3. 汇总两个 subagent 的结果,按下面的格式统一输出。

输出格式:

- 先用一行给出总体结论:类型问题 N 项、无障碍问题 M 项。
- 然后分「类型安全(typescript-analyzer)」「无障碍(accessibility-checker)」两节,每节用「问题 → 位置(文件:行号)→ 修复建议」三段式逐条列出,并标注优先级(P0 阻塞 / P1 建议 / P2 可选)。
- 若两个 subagent 均未发现任何问题(N=0 且 M=0),不要输出空的分节,直接输出一行:`✅ 审查通过`。

本 Skill 只读不改,仅产出审查报告;需要落地修复时由用户确认后再执行。
