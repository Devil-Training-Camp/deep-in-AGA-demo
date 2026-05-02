# 2.6 演示脚本：MCP 开发

本演示依赖两个 Demo 目录配合使用：

- `demos/2-6-component-library/` — 模拟一个已有组件库的项目（React + 组件 stories）
- `demos/2-6-mcp-server/`（本目录）— 读取上述组件库的 MCP Server

---

## 演示准备

### 步骤 1：启动组件库预览

```bash
pnpm --filter @demos/2-6-component-library run dev
```

打开 http://localhost:5173，向学员展示已有的三个组件（Button、Badge、Card）。

**讲解要点**：这是一个真实项目里的组件库，每个组件都有 `.stories.tsx` 文件记录了 Props、变体和使用示例。但这些信息 AI 默认看不到——它不知道这里有什么组件，每次要问都得手动粘贴。

---

### 步骤 2：构建并注册 MCP Server

```bash
# 安装依赖并构建
cd demos/2-6-mcp-server
npm install
npm run build
```

注册到 Claude Code（替换为实际绝对路径）：

```bash
claude mcp add \
  --transport stdio \
  --env STORIES_DIR=/absolute/path/to/demos/2-6-component-library/src/stories \
  component-library \
  -- node /absolute/path/to/demos/2-6-mcp-server/build/index.js
```

或者手动编辑 `~/.claude.json` 的 `mcpServers` 字段：

```json
{
  "mcpServers": {
    "component-library": {
      "command": "node",
      "args": ["/absolute/path/to/demos/2-6-mcp-server/build/index.js"],
      "env": {
        "STORIES_DIR": "/absolute/path/to/demos/2-6-component-library/src/stories"
      }
    }
  }
}
```

---

### 步骤 3：验证连接

启动 Claude Code，输入 `/mcp`，确认 `component-library` 服务器状态为 connected，能看到三个工具（list_components / get_component_info / search_components）。

---

## 演示一：AI 主动发现组件（核心价值）

**目标**：展示"AI 不再被动等数据——它知道去哪里找"

**输入**：

```
列出项目里有哪些可用组件
```

**预期效果**：

Claude 调用 `list_components`，返回 Button、Badge、Card 三个组件。

**讲解要点**：这里 AI 没有读文件系统，也没有用 Bash，它通过 MCP Server 的 `list_components` 工具获取了信息——MCP 把"读取组件列表"这个能力封装成了标准工具，AI 知道什么时候该调用它。

---

## 演示二：读取组件详情，自动生成符合规范的代码

**目标**：展示"AI 读懂 stories，生成的代码和组件库一致"

**输入**：

```
我需要实现一个文章列表项，展示文章标题、状态和操作按钮。请先查看现有组件，再用它们实现。
```

**预期效果**：

1. Claude 调用 `list_components`，看到有 Button、Badge、Card
2. 调用 `get_component_info("Card")`，读取 Card 的 Props 和使用示例
3. 调用 `get_component_info("Badge")`，读取状态标签的变体定义
4. 生成的代码直接使用 `<Card>` + `<Badge>` + `<Button>`，参数名称和设计约束完全符合库的规范

**讲解要点**：注意生成的代码里 `variant="success"` 这类参数——AI 是从 stories 里读出来的，不是猜的。这就是"从被动等数据变成主动获取数据"的实际体现。

---

## 演示三：防止重复实现

**目标**：展示 MCP 提升组件复用率

**输入**：

```
帮我实现一个"状态标签"组件，显示任务的完成状态（进行中 / 已完成 / 已暂停）
```

**预期效果**：

Claude 调用 `search_components("badge")` 或 `list_components`，发现项目里已有 `Badge` 组件，读取其文档后返回：

> 项目中已有 Badge 组件，可以直接用 `variant` 控制状态颜色：
> ```tsx
> <Badge variant="info" dot>进行中</Badge>
> <Badge variant="success" dot>已完成</Badge>
> <Badge variant="default">已暂停</Badge>
> ```

**讲解要点**：没有 MCP，AI 不知道项目里有 Badge，大概率会重新实现一个功能相似的组件，命名可能叫 StatusTag 或 StatusBadge，和现有组件库产生分歧。有了 MCP，AI 先搜索再实现，复用率自然提升。

---

## 演示四（可选）：理解 MCP Server 代码结构

**目标**：展示 MCP Server 的开发模式

打开 `src/index.ts`，对照讲解三个关键点：

1. `McpServer` + `StdioServerTransport` — 服务器实例和传输层
2. `server.registerTool(name, schema, handler)` — 工具注册的三要素
3. `console.error()` 而非 `console.log()` — stdio 模式的关键约束

**输入**（让 AI 现场扩展）：

```
给这个 MCP Server 添加一个新工具 get_component_source，
读取 src/components/{ComponentName}.tsx 的源码，
这样 AI 不仅能看文档还能看实现
```

**预期效果**：AI 在 `src/index.ts` 里追加新的 `registerTool` 调用，构建后新工具立即可用。

---

## 演示要点总结

| 演示 | 调用的工具 | 展示的核心价值 |
|------|-----------|---------------|
| 演示一 | `list_components` | AI 主动获取项目信息 |
| 演示二 | `get_component_info` × 2 | 读懂文档，生成合规代码 |
| 演示三 | `search_components` | 先搜索，防止重复实现 |
| 演示四 | — | MCP Server 本身也可以用 AI 扩展 |
