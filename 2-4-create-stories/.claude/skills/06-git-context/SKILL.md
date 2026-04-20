---
name: git-context
description: Generate commit message or PR summary based on current git status. Use when user wants to write a commit message or summarize recent changes.
allowed-tools: Read, Bash(git *)
---

# 生成提交信息

## 当前 Git 状态

当前分支：!`git branch --show-current`

最近 5 个提交：
!`git log -5 --oneline`

未提交的变更：
!`git status --short 2>/dev/null || echo "（无变更或不在 Git 仓库中）"`

本次改动的文件：
!`git diff --name-only HEAD 2>/dev/null || echo "（暂无 staged 变更）"`

## 任务

根据上述 Git 状态，生成一条符合 Conventional Commits 规范的提交信息：

- 格式：`<type>(<scope>): <description>`
- type 选项：feat / fix / docs / style / refactor / test / chore
- description 用中文，简洁描述做了什么

如果变更涉及多个模块，额外生成一段 body 说明各模块的变更内容。

## 示例输出

```
feat(Button): 新增 loading 状态和 disabled 样式

- Button 组件支持 loading prop，显示旋转图标
- 新增 disabled 状态样式，区分于 loading 状态
- 补充 ButtonProps 类型定义中的 loading 字段
```
