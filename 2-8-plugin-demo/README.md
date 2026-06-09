# frontend-review —— Claude Code Plugin 五大能力演示

这个插件围绕「前端代码审查」一个主题,把 Claude Code Plugin 的五类扩展能力组装成一条完整工作流。安装后会话启动即可看到入口提示,改完 TS 文件会自动提醒做类型校验,审查时再调用对应 Skill 或 Subagent 深入分析。

## 目录结构与能力映射

```
2-8-plugin-demo/
├── .claude-plugin/
│   └── plugin.json          # 清单 + lspServers 字段(LSP 能力)
├── skills/                  # Skills(命名空间 /frontend-review:)
│   ├── check-types/SKILL.md
│   └── review-component/SKILL.md
├── agents/                  # Subagents(多个 Agent 配置)
│   ├── react-reviewer.md
│   ├── a11y-auditor.md
│   └── perf-analyzer.md
├── hooks/                   # Hooks(事件触发的 Shell 脚本)
│   ├── hooks.json
│   ├── on-start.sh          # SessionStart
│   └── post-edit.sh         # PostToolUse: Write|Edit
├── .mcp.json                # MCP Servers(引用社区 @playwright/mcp)
└── README.md
```

| 能力 | 体现位置 | 说明 |
|------|---------|------|
| Skills | `skills/*/SKILL.md` | 插件名 `frontend-review` 即命名空间前缀,调用形如 `/frontend-review:check-types` |
| Subagents | `agents/*.md` | 三个独立 Agent 配置,各自带 frontmatter(name/description/model/tools) |
| MCP Servers | `.mcp.json` | 通过 `npx @playwright/mcp` 引用社区已有的 MCP,无需自己实现 |
| Hooks | `hooks/hooks.json` + `*.sh` | SessionStart 打印入口、PostToolUse 在编辑 TS 文件后提醒校验 |
| LSP Servers | `plugin.json` 的 `lspServers` 字段 | 接入 `typescript-language-server`,提供跳转/补全/诊断等代码智能 |

## 各能力使用方式

Skills 带命名空间前缀直接调用:

```
/frontend-review:check-types
/frontend-review:review-component src/App.tsx
```

Subagents 在需要深度分析时由主 Agent 委派,或显式要求(例如「用 react-reviewer 审查 src/App.tsx」「让 a11y-auditor 检查无障碍」「用 perf-analyzer 看看渲染性能」)。

Hooks 无需手动触发:会话启动时 `on-start.sh` 打印能力清单;每次 Write/Edit 后 `post-edit.sh` 检查改动文件,若是 `.ts/.tsx` 则提示运行类型校验。

MCP 的 Playwright server 提供浏览器自动化工具,可用于审查时打开页面、截图、检查实际渲染效果。

LSP 在打开 `.ts/.tsx/.js/.jsx` 文件时自动启动,为 Claude 提供符号定义、引用查找、类型诊断等智能能力。

## 本地安装与验证

把本目录作为插件挂载(开发态),在 Claude Code 中:

```
/plugin marketplace add <本仓库路径>
/plugin install frontend-review
```

依赖前置项:

- LSP:需本机可执行 `typescript-language-server`(`npm i -g typescript-language-server typescript`),否则 LSP 静默不启用。
- MCP:首次调用 Playwright 工具时 `npx` 会自动拉取 `@playwright/mcp`。

验证清单:

1. 启动会话 → 应看到 `on-start.sh` 打印的能力清单(Hooks + SessionStart)。
2. 输入 `/` → 应能补全出 `/frontend-review:check-types` 等命令(Skills + 命名空间)。
3. 编辑任意 `.ts` 文件 → 应看到「建议运行 check-types」的提示(Hooks + PostToolUse)。
4. 要求「用 react-reviewer 审查某组件」→ 应委派到对应 Subagent。
5. 打开 `.tsx` 文件做跳转/查引用 → 由 LSP 支撑。
