# Deep in AGA - 课程配套 Demo

《Deep in AGA - AI 提效前端开发》课程的配套 Demo 仓库。

## 目录结构

| 目录 | 说明 |
|------|------|
| `0-1-openclaw-evolution` | OpenClaw 演化示例 |
| `0-2-linear-history` | Linear History 示例 |
| `1-0-quick-start` | 第一章：快速上手 Claude Code |
| `2-2-capability-synergy` | 第二章：能力协同 |
| `2-3-context-demo` | 第二章：上下文管理 Demo |
| `2-3-interface-demo` | 第二章：接口设计 Demo |
| `3-0-article-to-video` | 第三章：文章转视频 Pipeline |
| `6-4-react-component-testing` | 第六章：React 组件测试 |

## 技术栈

- **框架**: React 18
- **构建工具**: Vite
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **包管理**: PNPM Workspace

## 使用方式

```bash
# 安装依赖
pnpm install

# 启动所有 Demo
pnpm -r run dev

# 启动指定 Demo（以 1-0-quick-start 为例）
pnpm --filter @demos/1-0-quick-start run dev
```

## 相关链接

- 课程主仓库：[deep-in-AGA](https://github.com/Devil-Training-Camp/deep-in-AGA)
- 作者：[Tecvan](https://github.com/Tecvan-fe)
