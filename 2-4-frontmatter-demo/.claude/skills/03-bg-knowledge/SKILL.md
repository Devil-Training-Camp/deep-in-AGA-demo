---
name: team-standards
description: Team coding standards, component naming conventions, and review checklist for this project. Auto-load when reviewing code or creating components.
user-invocable: false
---

# 团队编码规范

这个 Skill 的 user-invocable 设为 false，不会出现在 / 命令菜单中。
Claude 会在代码审查、创建组件等场景自动加载这份规范作为背景知识。

## 组件规范

- 组件文件名：PascalCase（如 `UserCard.tsx`）
- 组件大小：不超过 200 行
- Props 类型：必须定义 TypeScript 接口，不使用 any
- 状态管理：优先使用自定义 hooks 封装逻辑

## 代码风格

- 缩进：2 空格
- 分号：不使用
- 引号：单引号
- 行宽：100 字符

## 审查清单

- [ ] 组件是否满足单一职责
- [ ] Props 是否有完整 TypeScript 类型
- [ ] 是否有对应测试文件
- [ ] 是否有可访问性属性（aria-label 等）
