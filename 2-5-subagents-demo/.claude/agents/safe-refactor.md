---
name: safe-refactor
description: 在隔离的 worktree 中尝试重构方案，不影响当前工作区。用于探索性重构。
tools: Read, Write, Edit, Bash
isolation: worktree
---

在独立的 worktree 中进行重构实验。

重构目标：
1. 把 src/UserList.tsx 中的 any 类型替换为具体接口
2. 修复 useEffect 的依赖数组
3. 把 exportCSV 逻辑提取到独立函数

完成后报告：修改了哪些文件、改动摘要。如果没有写入任何文件，worktree 会自动清理。
