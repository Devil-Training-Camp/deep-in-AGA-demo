---
name: scan-codebase
description: Deep scan the entire codebase for patterns, issues, or statistics. Runs in isolated Subagent to avoid polluting main session.
context: fork
agent: Explore
effort: high
---

# 代码库全量扫描

在独立 Subagent 中运行（context: fork），不影响主会话上下文。
使用 Explore 智能体进行快速只读探索。

## 扫描内容

1. 统计代码库规模
   - 文件数量（.tsx / .ts / .css）
   - 总行数
   - 组件数量

2. 识别潜在问题
   - 超过 200 行的组件文件
   - 使用了 any 类型的地方
   - 缺少测试文件的组件

3. 生成统计报告，汇报给主会话

## 输出格式

```
代码库扫描报告
==============
文件统计：X 个 .tsx，Y 个 .ts
问题汇总：Z 个文件超过 200 行
推荐关注：[具体文件列表]
```
