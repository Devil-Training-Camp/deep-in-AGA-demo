---
name: check-props-imperative
description: Check React component props using imperative step-by-step commands
allowed-tools: Bash
---

# 检查组件 Props（命令式 - 反面教材）

⚠️ 这个 Skill 用命令式写法，刻意写死了执行步骤。

## 执行步骤

1. 运行 `ls src/components` 列出所有文件
2. 找到所有 .tsx 文件
3. 对每个 .tsx 文件运行 `cat` 命令读取内容：
   - `cat src/components/Button.tsx`
4. 找出每个文件中的 interface 定义
5. 输出 Props 列表
