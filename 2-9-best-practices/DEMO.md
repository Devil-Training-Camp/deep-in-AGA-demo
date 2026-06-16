# 2.9 演示脚本：Claude Code 最佳实践

这个目录是讲义 2.9 的配套演示项目，覆盖三个核心场景：

1. **CLAUDE.md 地图结构**：展示"地图型"上下文管理的效果
2. **Hooks 实战**：展示 PostToolUse / PreToolUse 的行为差异
3. **代码最小化**：展示让 AI 简化过度抽象代码的交互方式

---

## 演示准备

```bash
cd demos/2-9-best-practices
claude
```

---

## 演示一：CLAUDE.md 地图结构 [约 5 分钟]

**目标**：让学员亲眼看到地图型 CLAUDE.md 的组织方式，理解为什么"索引"比"百科全书"更有效。

### 第一步：打开 CLAUDE.md，展示地图结构

在 Claude Code 里输入：

```
读取 CLAUDE.md，给我看它的结构
```

**预期效果**：Claude 读取文件后会描述出一个简洁的索引结构——只有项目概览和规则路径，没有任何具体规则内容。

**讲解重点**：

- 打开 `.claude/rules/frontend.md`、`.claude/rules/backend.md`，展示具体规则在独立文件里
- 告诉学员：Claude 处理前端任务时只加载 `frontend.md`，不会把数据库规范也读进来

---

### 第二步：对比"堆砌型"的问题

在 Claude Code 里输入：

```
假设我把所有规则堆在 CLAUDE.md 里，会有什么问题？
```

**预期效果**：Claude 解释文件越长关键规则越容易被淹没、每次任务都要全量加载无关内容。

**核心要传达给学员的判断标准**：

- 规则能 50 行内写完 → 单文件没问题
- 超过 50 行，或者不同任务用完全不同规则集 → 切换到地图结构

---

## 演示二：Hooks 实战 [约 5 分钟]

**目标**：展示 Hooks 和 CLAUDE.md 规范的核心差异——确定性 vs 建议性。

### 第三步：展示 settings.json 中的 Hooks 配置

打开 `.claude/settings.json`，向学员展示：

```json
{
  "hooks": {
    "PostToolUse": [...],
    "PreToolUse": [...]
  }
}
```

**讲解重点**：

- PostToolUse：每次 Write/Edit 工具执行后自动触发
- PreToolUse：在 Bash 工具执行前拦截，检查命令内容
- 这两个 Hook 100% 执行，不依赖 Claude 是否"记得" CLAUDE.md 里的规范

---

### 第四步：演示 PostToolUse 自动格式化

在 Claude Code 里输入：

```
在 src/utils.ts 里添加一个格式很乱的工具函数：
const   add=(a:number,b:number)=>{return a+b}
```

**预期效果**：Claude 写入文件后，PostToolUse Hook 立即触发，终端里能看到 prettier 执行的输出，文件自动被格式化。

**讲解重点**：格式化"一定发生"——不是因为 Claude 遵守了某条规范，而是 Hook 机制保证的。

---

### 第五步：演示 PreToolUse 拦截危险命令

在 Claude Code 里输入：

```
帮我清理一下，删除 src/ 目录
```

**预期效果**：Claude 构造 `rm -rf src/` 命令时，PreToolUse Hook 检测到 `rm -rf`，阻断执行，并输出警告信息。

**讲解重点**：

- 这个拦截发生在命令执行之前，是前置阻断
- 对比 CLAUDE.md 里写"禁止执行危险命令"——AI 可能 80% 情况下遵守，20% 情况下遗漏

---

## 演示三：代码最小化 [约 4 分钟]

**目标**：展示 AI 倾向于生成过度抽象代码，以及如何通过明确反馈拿到简洁版本。

### 第六步：让 AI 生成一个"支持多数据源的数据获取函数"

在 Claude Code 里输入：

```
写一个支持从 API 和 localStorage 两个数据源获取用户数据的函数
```

**预期效果**：Claude 大概率生成包含以下内容的过度抽象版本：

- `DataSourceProvider` 接口
- `ApiDataSource`、`LocalStorageDataSource` 两个实现类
- 工厂函数或配置对象
- 20-40 行代码解决一个两行可以搞定的问题

**演示动作**：把生成的代码展示给学员，让他们先看到"AI 的默认选择"。

---

### 第七步：要求简化，看简化后的版本

继续输入：

```
这太复杂了，能简化吗？我只需要支持这两个数据源，不需要抽象
```

**预期效果**：Claude 给出类似下面的简化版本：

```typescript
async function getUserData(source: "api" | "localStorage") {
  const raw =
    source === "api" ? await fetchFromApi() : localStorage.getItem("userData");
  return raw ? JSON.parse(raw) : null;
}
```

**讲解重点**：

- 前后对比，代码量差 5-10 倍，但功能完全一样
- 这不是 AI 的问题，是 AI 的默认倾向——遇到了要主动纠正
- Boris Cherny（Claude Code 创建者之一）的原则：能删代码不要添加

---

## 附：目录结构说明

```
2-9-best-practices/
├── DEMO.md                          # 本文件，演示脚本
├── CLAUDE.md                        # 地图型配置（演示一用）
├── .claude/
│   ├── settings.json                # Hooks 配置（演示二用）
│   ├── rules/
│   │   ├── frontend.md              # 前端规范（演示一展示的子文件）
│   │   ├── backend.md               # 后端规范
│   │   └── database.md              # 数据库规范
│   └── skills/
│       ├── format-code/SKILL.md     # 绑定 Haiku 的格式化 Skill（模型选择演示）
│       └── security-review/SKILL.md # 绑定 Opus 的安全审查 Skill
└── src/
    └── utils.ts                     # 演示三的目标文件（空文件，等待 AI 填充）
```
