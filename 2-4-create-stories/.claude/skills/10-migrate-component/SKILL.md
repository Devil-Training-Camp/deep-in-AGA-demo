---
name: migrate-component
description: Migrate component from one framework to another. Use when user wants to migrate or convert a component between React, Vue, or Svelte.
argument-hint: <component> <from> <to>
allowed-tools: Read, Write, Glob
---

# 组件迁移

## 参数验证

检查用户输入的参数：
- $0 必须是有效的组件名（PascalCase）
- $1 必须是 React、Vue、Svelte 之一
- $2 必须是 React、Vue、Svelte 之一
- $1 和 $2 不能相同

如果参数无效，提示用户正确的用法：
```
/migrate-component <ComponentName> <from> <to>
```

## 迁移任务

迁移 $0 组件，从 $1 迁移到 $2。

执行以下步骤：
1. 读取当前 $0 组件的源码
2. 分析组件的 Props、State、生命周期和事件处理逻辑
3. 按照 $2 框架的惯例重写组件：
   - React → Vue：将 JSX 转为 template，useState 转为 ref/reactive，useEffect 转为 onMounted/watch
   - Vue → React：将 template 转为 JSX，ref/reactive 转为 useState，watch 转为 useEffect
   - React/Vue → Svelte：将状态逻辑转为 Svelte 的 $: 响应式声明
4. 保留所有现有行为和业务逻辑
5. 更新对应的测试文件（如果存在）
6. 输出迁移后的文件路径和主要变更说明
