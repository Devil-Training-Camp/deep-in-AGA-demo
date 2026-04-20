---
name: readonly-review
description: Review code quality and generate report. Read-only analysis, no file modifications.
allowed-tools: Read, Grep, Glob
---

# 代码审查（只读模式）

这个 Skill 只允许 Read、Grep、Glob 工具。
审查结果只能输出到对话中，无法写入文件。

## 审查步骤

1. 扫描 src/ 目录找到所有 .tsx 文件
2. 逐一读取并检查：
   - 组件是否超过 200 行
   - Props 是否有 TypeScript 类型定义
   - 是否有 any 类型
   - 是否有注释说明复杂逻辑

3. 在对话中输出审查报告，格式如下：

## 审查报告

**通过 ✅**
- [文件列表]

**需要关注 ⚠️**
- [文件名]：[问题描述]

**必须修复 ❌**
- [文件名]：[问题描述]

> 注意：此 Skill 为只读模式，审查结果仅在对话中展示，
> 不会自动写入文件。如需保存报告，请手动复制。
