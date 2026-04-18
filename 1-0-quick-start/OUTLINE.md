# 1.0 快速上手 — 课程讲义

> 目标：30 分钟内完成三个动作，建立"AI 驱动闭环"的直观感受

---

## 一、准备工作（2 分钟）

**环境确认**：Node.js 22+、VS Code、Claude Code terminal /插件已安装

**账户**：Claude.ai 账号（有 Claude Code 权限）、Figma 账号

---

## 二、任务一：生成单元测试（8 分钟）

### 场景

项目里有这样一个函数，你要给它补测试：

```ts
export function calculateTotal(items, discountRate = 0) {
  if (!items || items.length === 0) return 0;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal * (1 - discountRate);
}
```

手写要覆盖哪些边界？空数组、null、折扣率为 1……容易漏。

### Prompt

```
为 src/utils/price.ts 中的 calculateTotal 函数生成完整的单元测试，使用 Vitest。
覆盖：正常情况、边界情况（空数组、零折扣、折扣率为 1）、异常情况（null/undefined 输入）
```

### 关键动作

```
运行测试，如果有失败的用例，直接修复，直到全部通过。
```

### 重点

- Claude Code **读文件 → 分析逻辑 → 生成测试 → 运行 → 修复**，全程不离开 IDE， 不编写一行代码
- 它主动补上了"折扣率为 1 时总价为 0"这个边界——这不是模板，是真的在分析代码

---

## 三、任务二：Figma MCP 生成组件 + Chrome 校验（12 分钟）

### 配置 MCP（先演示配置文件）

在项目根目录的 `.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--figma-api-key", "YOUR_FIGMA_API_KEY"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

> 重启 Claude Code 后生效。MCP 的本质：给 Claude Code 接上"读外部数据"的管道。

### 生成组件

**Prompt**

> 演示用公开文件：[Card UI Kit](https://www.figma.com/community/file/1192279930622803063/card-ui-kit)，打开后右键复制 User/Profile 卡片的组件链接

```
读取这个 Figma 组件，生成对应的 React 组件，使用 Tailwind CSS：
https://www.figma.com/...（你的组件链接）

要求：展示用户头像、名称、用户名，包含"关注"和"更多"两个按钮
```

### 用 Chrome MCP 验证

```
启动 dev server，打开 页面， Chrome DevTools MCP 验证 VertCard
1. 检查 DOM 结构是否和 Figma 对应
2. 读取头像、按钮的实际计算样式，确认颜色和间距
3. 模拟点击"play"按钮，确认交互正常
4. 查看控制台有无报错
如果有问题，直接修复。
```

### 讲解重点

- Figma MCP 给 Claude Code 看到的是**设计数据**（尺寸、颜色、间距），不是图片
- Chrome DevTools MCP 拿到的是**真实 DOM 和计算样式**，不是截图——能精确知道某个元素 padding 是 14px 而不是设计稿的 16px
- 两个"闭环"：生成→运行→修复（任务一），设计→生成→验证→修复（任务二）

---

## 四、课后练习布置（3 分钟）

> 不做现场演示，直接把练习题布置给学员，课后自行完成

### 场景：开发一个评分组件

告诉学员：每一步的 prompt 已经给出，照着做就能跑通，不需要手写任何代码。

**Step 1 需求描述**
```
需要一个评分组件：1-5 星，当前评分高亮，
点击后防抖 500ms 调用 PUT /api/ratings/:id，
加载中禁用交互
```

**Step 2 生成组件（两步走）**
```
读取这个 Figma 组件，生成 RatingComponent 的基础结构，使用 Tailwind CSS：
https://www.figma.com/...（替换成你的评分组件链接）
```
```
补全这个组件：加防抖、PUT /api/ratings/:id 的 API 调用、loading 状态，loading 时禁用交互。
```

**Step 3 生成测试并运行**
```
为 RatingComponent 生成 Vitest 测试，覆盖：点击更新评分、防抖触发 API、loading 状态禁用交互。
运行，修复失败用例。
```

**Step 4 提交 + 部署**

提示学员：在 `.mcp.json` 中追加 GitHub MCP 配置（参考任务二的格式），然后：

```
用 GitHub MCP 提交本次变更，commit message 说明新增了评分组件，创建 PR，target 是 main
```

```
PR 已合并，用 AWS CLI 把构建产物同步到 S3，bucket 是 my-app-bucket，路径是 /dist。
```

### 讲解重点

- 整条链路：Figma MCP（读设计）→ Claude Code（写代码）→ Chrome MCP（验证）→ GitHub MCP（提交）→ AWS CLI（部署）
- Claude Code 是调度中枢，学员的角色是在关键节点审核，而不是在工具间切换
- 卡住了先让 Claude Code 读报错自行排查，不要自己动手调试

---

## 五、小结（2 分钟）

三个动作对应三种 AI 工作模式：

| 动作 | 模式 | 闭环 |
|------|------|------|
| 生成单元测试 | 读代码 → 生成 → 自验证 | 生成→运行→修复 |
| Figma 生成组件 | 读设计 → 生成 → 验证 | 设计→生成→DOM 分析→修复 |
| 完整工作流 | 多工具链接 | 需求→代码→测试→提交→部署 |

下一节（1.1）开始讲这套体系背后的工具层，你现在已经用过最典型的几个。

要求：
1. 不要手写代码！！！
2. 规避低效的验证过程，前几轮一定是 ai 帮你验证