# 1.0 快速上手演示工程

对应文章：`1-ai-era-frontend/1-0-quick-start.md`

## 文件与章节对照

| 文件 | 对应章节 | 说明 |
|------|---------|------|
| `src/utils/price.ts` | 1.0.2 任务一 | 待测试的 calculateTotal 函数 |
| `src/utils/price.test.ts` | 1.0.2 任务一 | Claude Code 生成的单元测试 |
| `src/components/UserCard.tsx` | 1.0.3 任务二 | Figma MCP 生成的 UI 组件 |
| `src/components/RatingComponent.tsx` | 1.0.4 完整工作流 | Figma MCP UI + Claude Code 业务逻辑 |
| `src/components/RatingComponent.test.tsx` | 1.0.4 Step 4 | Claude Code 生成的组件测试 |
| `.mcp.json` | 1.0.1 准备工作 | Figma / Chrome DevTools / GitHub MCP 配置 |

## 快速开始

```bash
pnpm install
pnpm dev        # 预览组件效果
pnpm test       # 运行单元测试
pnpm build      # 构建产物
```

## MCP 配置

使用前需要在 `.mcp.json` 中替换以下占位符：

- `<your-figma-api-key>`：Figma 账号 → Settings → Personal access tokens
- `<your-github-token>`：GitHub → Settings → Developer settings → Personal access tokens

Chrome DevTools MCP 无需 token，启动后连接本地 Chrome 即可。
