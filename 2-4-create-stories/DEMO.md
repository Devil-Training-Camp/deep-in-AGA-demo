# Demo：创建第一个 Skill

> 讲师用。这是"2.4 Skill 系统"第 2 节"创建第一个 Skill"的演示脚本，约 8 分钟。

## 准备工作（课前完成）

```bash
cd demos/2-4-skill-system
claude   # 用 Claude Code 打开此目录
```

确认 `src/components/Button.tsx` 存在，这是演示用的目标组件。

---

## Step 1：展示目标组件 [约 1 分钟]

打开 `src/components/Button.tsx`，带学员快速看一眼：

- 有 `ButtonProps` 接口，包含 6 个 Props（children/variant/size/disabled/loading/onClick）
- 有 TypeScript 类型（`ButtonVariant`、`ButtonSize`）
- 这就是我们要为它生成 Storybook stories 的组件

**讲解要点**：这种组件在实际项目里每周都要写。每次都要手动建 `.stories.tsx`，挑变体、填示例值，重复且容易漏——用 Skill 自动化它。

---

## Step 2：创建 Skill 目录和文件 [约 2 分钟]

在终端执行：

```bash
mkdir -p ~/.claude/skills/create-stories
```

然后新建 `~/.claude/skills/create-stories/SKILL.md`，写入以下内容：

```yaml
---
name: create-stories
description: Generate Storybook stories for React components. Use when user wants to create stories for a component or mentions "Storybook documentation"
allowed-tools: Read, Write, Glob
---

# 生成 Storybook Stories

为 React 组件自动生成 stories 文件。

## 执行步骤

1. 使用 Read 工具读取用户指定的组件文件，分析组件的 Props 类型定义，识别所有可选和必选 Props

2. 生成 stories 文件（文件名：`<ComponentName>.stories.tsx`，位置：与组件文件同目录），包含以下 stories：
   - Default：所有 Props 使用默认值
   - All Props：展示所有 Props 的组合
   - Interactive：使用 Storybook 的 args 实现交互式控制

3. 确保代码符合规范：使用 CSF 3.0 格式，导入 Meta 和 StoryObj 类型，添加 TypeScript 类型注解

## 注意事项

- 如果组件已有 stories 文件，询问用户是否覆盖
- 对于复杂的 Props（如函数、React 节点），提供合理的示例值
```

**讲解要点**：
- `name` = 命令名，`/create-stories` 就是从这里来的
- `description` 决定 Claude 能否"自动识别"这个 Skill，要包含关键触发词
- `allowed-tools: Read, Write, Glob` = 这个 Skill 只能读写文件，不能执行 Bash

---

## Step 3：重启会话，确认 Skill 加载 [约 30 秒]

**重要**：Skill 注册发生在会话启动时，需要重启 Claude Code 才能生效。

重启后输入 `/skills` 或 `/`，确认 `create-stories` 出现在列表中。

---

## Step 4：手动调用测试 [约 2 分钟]

在 Claude Code 里输入：

```text
/create-stories src/components/Button.tsx
```

**预期效果**：
- Claude 读取 Button.tsx
- 识别出 `ButtonProps`（variant/size/disabled/loading 等）
- 生成 `src/components/Button.stories.tsx`
- 内容包含 Default、Primary、Secondary、Danger、Loading、Disabled 等 story

打开生成的文件给学员看，验证内容正确。

---

## Step 5：自然语言触发测试 [约 2 分钟]

删除刚才生成的 stories 文件（方便演示效果清晰）：

```bash
rm src/components/Button.stories.tsx
```

在 Claude Code 里输入：

```text
帮我为 Button 组件创建 Storybook 文档
```

**预期效果**：Claude 识别出这句话匹配 `create-stories` 的 description，自动加载并执行，同样生成 `Button.stories.tsx`。

**讲解要点**：两种调用方式输出相同结果。description 写得好，自然语言就能自动触发；写得模糊，就只能靠 `/` 手动调用。

---

## 备用方案（如果演示出问题）

`.claude/skills/09-create-stories/SKILL.md` 是预备好的完整版本，可以直接展示内容而不现场手写。

---

## 快速验证清单

- [ ] `src/components/Button.tsx` 存在，有完整的 `ButtonProps` 接口
- [ ] `~/.claude/skills/create-stories/SKILL.md` 创建完成
- [ ] 重启会话后 `/skills` 能看到 `create-stories`
- [ ] `/create-stories src/components/Button.tsx` 生成了 `.stories.tsx` 文件
- [ ] 自然语言"帮我为 Button 创建 Storybook 文档"也触发了同一个 Skill
