# 2.5 演示脚本：Subagents 多智能体

## 演示准备

在 Claude Code 中打开这个目录：

```bash
cd demos/2-5-subagents-demo
claude
```

---

## 演示一：上下文隔离（核心价值）

**目标**：让学员亲眼看到"有 Subagent vs 没有 Subagent"在上下文消耗上的差异。

### 第一步：不用 Subagent，直接分析日志

输入：

```
帮我分析 logs/app.log，总结一下有哪些问题
```

**预期效果**：Claude 把整个日志文件读进来，大量内容出现在对话里——ERROR 行、INFO 行、堆栈跟踪都铺满屏幕。告诉学员：这些内容现在全在主对话的上下文窗口里，占用了宝贵的 token 空间。

---

### 第二步：用 Subagent 做同样的分析

新开一个对话，或让学员注意接下来上下文的变化。输入：

```
@log-analyzer 分析 logs/app.log，总结有哪些问题
```

**预期效果**：
- 出现 `⎿` 缩进标识，表示 Subagent 在独立上下文里工作
- 主对话只收到一条结构化总结（错误统计 + 高峰时段 + 修复建议）
- 中间所有读文件过程、原始日志内容，都留在了 Subagent 的上下文里

**讲解重点**：指着屏幕上的 `⎿` 说——这就是 Subagent 的工作边界。主对话上下文只增加了一条总结，而不是整个日志。

---

## 演示二：自动委派 + @-mention

**目标**：展示两种触发 Subagent 的方式：描述触发 vs 明确 @-mention。

### 第三步：展示 code-reviewer 的 description

打开 `.claude/agents/code-reviewer.md`，指出 description 字段：

```
修改代码后主动使用
```

这句话是告诉 Claude：**什么时候该自动委派**。

---

### 第四步：让 Claude 修改代码，观察自动委派

输入：

```
帮我给 src/UserList.tsx 里的 handleDelete 函数加上错误处理
```

**预期效果**：Claude 修改 UserList.tsx 之后，自动委派给 `code-reviewer` 进行审查（因为 description 里说了"修改代码后主动使用"）。学员能看到自动触发的 Subagent 标识。

> 如果没有自动触发：可以直接进入第五步演示 @-mention。自动委派的触发依赖模型判断，不是 100% 稳定——这本身也是一个值得说明的点。

---

### 第五步：用 @-mention 明确指定

输入：

```
@code-reviewer 审查 src/UserList.tsx，重点看 TypeScript 类型问题
```

**预期效果**：`code-reviewer` Subagent 被明确触发，返回审查结果，格式是 🔴/🟡/🟢 三级分类。预期能找到：
- 🔴 多处 `any` 类型（`useState<any[]>`、`handleDelete(id: any)` 等）
- 🟡 useEffect 缺少 `sortField`、`sortOrder` 依赖
- 🟢 建议拆分 exportCSV 到单独组件

---

## 演示三：Memory 持久化

**目标**：展示 Subagent 如何跨对话积累项目知识。

### 第六步：第一次审查，触发 memory 写入

确保在上一步的基础上（或重新触发一次）：

```
@code-reviewer 审查 src/UserList.tsx
```

审查完成后，检查 memory 文件是否生成：

```bash
cat .claude/agent-memory/code-reviewer/MEMORY.md
```

**预期效果**：可以看到 Subagent 自动写入了类似这样的内容：
```
## 项目观察
- 大量使用 any 类型替代具体接口（UserList.tsx）
- useEffect 依赖管理不严格
- 组件职责偏多，建议按展示/交互/数据拆分
```

---

### 第七步：审查另一个文件，观察 memory 复用

新开对话（这样明显体现跨对话），输入：

```
@code-reviewer 审查 src/UserCard.tsx
```

**预期效果**：Subagent 的审查结果会引用上次记录的项目惯例，比如主动提到"与 UserList.tsx 中的 any 使用习惯对比，UserCard.tsx 的类型定义更规范"。这说明它已经在用积累的项目上下文了。

---

## 附：agent 配置文件说明

| 文件 | 工具权限 | 特殊配置 | 用途 |
|------|---------|---------|------|
| `.claude/agents/log-analyzer.md` | Read, Bash, Glob | 无 | 日志分析，高输出量隔离 |
| `.claude/agents/code-reviewer.md` | Read, Grep, Glob（只读） | `memory: project` | 代码审查 + 跨会话积累项目知识 |
