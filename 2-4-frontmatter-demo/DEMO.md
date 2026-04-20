# Section 3 演示脚本：Frontmatter 配置参考

## 演示准备

在 Claude Code 中打开这个目录：
```bash
cd demos/2-4-frontmatter-demo
claude
```

---

## 演示 3.2：调用权限控制（disable-model-invocation）

### 第一步：加载不安全的 deploy Skill

在 Claude Code 中打开 `.claude/skills/01-deploy-unsafe/SKILL.md`，
让学员看到它**没有** `disable-model-invocation` 字段。

然后输入以下提示词（模拟用户的日常表达）：

```
我想把应用部署到生产环境
```

**预期效果**：Claude 识别到 `deploy-to-prod` Skill 的 description 匹配，
**自动调用**了这个 Skill，开始执行部署流程——这是危险的。

---

### 第二步：展示加了保护的版本

打开 `.claude/skills/02-deploy-safe/SKILL.md`，
让学员看到 `disable-model-invocation: true`。

然后再次输入同样的提示词：

```
我想把应用部署到生产环境
```

**预期效果**：Claude **不会自动触发** deploy-to-prod-safe，
而是用普通对话回应。只有用户手动输入 `/deploy-to-prod-safe` 才会执行。

---

### 第三步：展示 user-invocable: false（背景知识）

打开 `.claude/skills/03-bg-knowledge/SKILL.md`，
让学员看到 `user-invocable: false`。

输入 `/`，让学员观察**命令菜单**中没有 `team-standards` 这个 Skill。

然后让 Claude 做一件需要用到团队规范的事：

```
帮我检查 src/components/Card.tsx 是否符合团队规范
```

**预期效果**：Claude 自动加载了 `team-standards` 作为背景知识，
审查结果会基于规范里的标准（组件不超过 200 行、Props 要有 TypeScript 类型等）。

---

## 演示 3.3：工具权限（allowed-tools）

### 第四步：运行只读审查 Skill

打开 `.claude/skills/04-readonly-review/SKILL.md`，
指出 `allowed-tools: Read, Grep, Glob`——没有 Write。

执行命令：

```
/readonly-review
```

**预期效果**：
- Claude 扫描 `src/` 目录、读取文件——正常
- 审查完成后，发现 `UserList.tsx` 有 `any` 类型问题
- 当 Claude 想把报告写入文件时，**被工具权限阻止**（Write 不在 allowed-tools 里）
- 审查结果只在对话中显示，无法自动保存

---

## 演示 3.4：执行环境（context: fork）

### 第五步：运行 Fork 扫描 Skill

打开 `.claude/skills/05-scan-fork/SKILL.md`，指出：
- `context: fork`：独立 Subagent 执行
- `agent: Explore`：使用快速只读智能体
- `effort: high`：高投入扫描

执行命令：

```
/scan-codebase
```

**预期效果**：
- 结果以 `⎿` 符号 + 缩进的形式出现——这是 Claude Code 的 Subagent 返回标识
- 执行完后，输入"今天几号？上面的扫描结果你还记得吗？"
- 主会话看不到 Subagent 的中间过程，只收到最终汇报——这就是 fork 的价值

---

## 综合讲解：完整配置示例

最后展示 `02-deploy-safe` 的所有字段：

| 字段 | 值 | 作用 |
|------|-----|------|
| `name` | deploy-to-prod-safe | Skill 名称，用于 / 命令 |
| `description` | Deploy to production... | 语义匹配触发词 |
| `disable-model-invocation` | true | 禁止 Claude 自动触发 |
| `allowed-tools` | Bash(vercel *), Bash(git *), Read | 只允许部署相关命令 |
| `argument-hint` | [environment] | Tab 提示可选参数 |
