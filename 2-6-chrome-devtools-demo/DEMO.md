# Chrome DevTools MCP Demo

这是一个故意埋入 Bug 的商品管理后台，用于演示如何借助 Chrome DevTools MCP 让 AI 自动发现并修复页面问题。

## 页面内的 Bug

### Bug 1 — JS 运行时错误（TypeError）

**文件**：`src/App.tsx` 第 22 行

```tsx
// profile 初始值为 null，页面首次渲染时直接访问 profile!.name 会抛出
const greeting = `欢迎回来，${profile!.name}`;
// TypeError: Cannot read properties of null (reading 'name')
```

**现象**：页面打开后立即白屏，Chrome 控制台报 TypeError。

**修复**：改为 `const greeting = profile ? \`欢迎回来，${profile.name}\` : "欢迎回来";`

---

### Bug 2 — 样式错误（按钮不可见）

**文件**：`src/App.tsx` 第 64 行 & `src/components/ProductList.tsx` 第 68 行

```tsx
// 文字颜色和背景色相同，按钮内容不可见
<button className="bg-blue-600 text-blue-600 ...">
  + 新增商品
</button>
```

**现象**：商品列表右上角的"新增商品"按钮和每行"编辑"按钮显示为纯色方块，文字消失。

**修复**：将 `text-blue-600` 改为 `text-white`。

---

## 演示步骤

### 前置配置

在项目根目录的 `.mcp.json` 中配置 Chrome DevTools MCP（使用固定 profile 目录保持登录态）：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", "chrome-devtools-mcp@latest",
        "--userDataDir", "common/chrome-profile",
        "--ignore-default-chrome-arg=--disable-extensions"
      ]
    }
  }
}
```

### 第一步：启动 Dev Server

```bash
cd demos/2-6-chrome-devtools-demo
pnpm install
pnpm dev
# 默认运行在 http://localhost:5173
```

### 第二步：让 AI 打开页面并排查问题

在 Claude Code 中输入：

```
用 chrome devtools mcp 打开 http://localhost:5173，检查页面是否有报错或样式问题，找到后帮我修复
```

### 预期 AI 行为

1. 调用 `chrome-devtools` MCP 的 `navigate` 工具打开页面
2. 调用 `get_console_logs` 获取控制台日志，发现 TypeError
3. 调用 `take_screenshot` 截图，发现按钮不可见
4. 读取 `src/App.tsx` 定位错误来源
5. 修复 Bug 1（null 访问）和 Bug 2（颜色问题）
6. 刷新页面验证修复效果
