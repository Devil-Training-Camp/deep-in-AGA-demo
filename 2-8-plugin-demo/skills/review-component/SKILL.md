---
name: review-component
description: 按本课程 React 规范审查指定组件文件,输出可执行的改进清单。当用户想评审某个 React 组件的结构、职责拆分、hooks 用法时使用。
argument-hint: "<组件文件路径>"
allowed-tools: "Read Grep Glob"
---

调用方式:`/frontend-review:review-component src/App.tsx`

待审查文件:`$ARGUMENTS`。读取该文件后,逐项核对以下规范并给出结论:

1. 单一职责:组件是否只负责一个功能,行数是否超过 200 行。超出则指出可拆分的子组件边界。
2. 状态逻辑复用:重复的状态逻辑是否抽成了自定义 hook。指出可下沉到 `useXxx` 的片段。
3. 依赖注入:外部依赖是否通过 props 注入以便测试,而非在组件内部直接 new / import 副作用模块。
4. 函数式优先:是否使用纯函数组件而非类组件。
5. 类型完整性:props 是否有明确类型定义,有无隐式 any。

输出格式:先给一句整体评价,再用「问题 → 位置(文件:行号)→ 建议」的三段式逐条列出,最后标注一个优先级(P0 阻塞 / P1 建议 / P2 可选)。审查只读不改,需要落地修改时再交给 `react-reviewer` agent 或由用户确认。
