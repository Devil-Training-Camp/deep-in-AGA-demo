#!/bin/bash
# 2-8 Plugin 演示重置脚本
# 在每次演示前运行，清理上次演示留下的状态
# 用法（在仓库根目录执行）：bash demos/2-8-demo-workspace/reset.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SETTINGS="$HOME/.claude/settings.json"

echo "=== 2-8 Plugin 演示环境重置 ==="
echo ""

# 1. 从 ~/.claude/settings.json 移除演示插件（commit-commands、pr-review-toolkit）
echo "[1/4] 从 user settings 移除演示插件..."
python3 - "$SETTINGS" <<'EOF'
import json, sys

path = sys.argv[1]
with open(path) as f:
    cfg = json.load(f)

demo_plugins = [
    "commit-commands@claude-code-plugins",
    "pr-review-toolkit@claude-code-plugins",
]

changed = False
for key in demo_plugins:
    if key in cfg.get("enabledPlugins", {}):
        del cfg["enabledPlugins"][key]
        print(f"      removed: {key}")
        changed = True

if changed:
    with open(path, "w") as f:
        json.dump(cfg, f, indent=4, ensure_ascii=False)
    print("      settings.json 已更新")
else:
    print("      无需清理（插件未安装）")
EOF

# 2. 从 .claude/settings.json 移除 project scope 安装的插件（如果存在）
PROJECT_SETTINGS="$REPO_ROOT/.claude/settings.json"
if [ -f "$PROJECT_SETTINGS" ]; then
    echo "[2/4] 从 project settings 移除演示插件..."
    python3 - "$PROJECT_SETTINGS" <<'EOF'
import json, sys

path = sys.argv[1]
with open(path) as f:
    cfg = json.load(f)

demo_plugins = [
    "commit-commands@claude-code-plugins",
    "pr-review-toolkit@claude-code-plugins",
]

changed = False
for key in demo_plugins:
    if key in cfg.get("enabledPlugins", {}):
        del cfg["enabledPlugins"][key]
        print(f"      removed: {key}")
        changed = True

if changed:
    with open(path, "w") as f:
        json.dump(cfg, f, indent=4, ensure_ascii=False)
    print("      .claude/settings.json 已更新")
else:
    print("      无需清理")
EOF
else
    echo "[2/4] .claude/settings.json 不存在，跳过"
fi

# 3. 删除实战环节生成的 frontend-review 插件目录
echo "[3/4] 清理实战生成目录..."
FRONTEND_REVIEW="$REPO_ROOT/demos/2-8-frontend-review"
if [ -d "$FRONTEND_REVIEW" ]; then
    rm -rf "$FRONTEND_REVIEW"
    echo "      已删除 demos/2-8-frontend-review/"
else
    echo "      demos/2-8-frontend-review/ 不存在，跳过"
fi

# 4. 制造一个 staged 改动，供 commit-commands 演示用
echo "[4/4] 准备 staged 改动（供 commit-commands 演示）..."
SAMPLE="$REPO_ROOT/demos/2-8-demo-workspace/sample.ts"
DEMOS_GIT="$REPO_ROOT/demos"

# 覆写为原始内容 + 时间戳注释（直接写，不依赖 git checkout）
cat > "$SAMPLE" <<TSEOF
// 演示用文件：供 commit-commands 插件演示时产生 git diff
// 每次演示前在这里随手加一行注释，制造可提交的改动

export function greet(name: string): string {
  return \`Hello, \${name}!\`
}

// demo reset: $(date '+%Y-%m-%d %H:%M:%S')
TSEOF

# 在 submodule 里 git add
git -C "$DEMOS_GIT" add 2-8-demo-workspace/sample.ts
echo "      已写入 sample.ts 并在 submodule 内 git add（可直接用 commit-commands 提交）"

echo ""
echo "✅ 重置完成，可以开始演示"
echo ""
echo "其他前置准备："
echo "  - 深度剖析章节需要提前 clone 仓库："
echo "    git clone https://github.com/anthropics/claude-code.git /tmp/claude-code"
echo ""
echo "演示顺序："
echo "  1. Plugin 是什么"
echo "     claude 里: /plugin marketplace add anthropics/claude-code"
echo "     终端里:    ls ~/.claude/plugins/marketplaces/claude-code-plugins/"
echo "     claude 里: /plugin install commit-commands@claude-code-plugins"
echo "     终端里:    ls ~/.claude/plugins/data/commit-commands-claude-code-plugins/"
echo "     claude 里: /commit-commands:commit"
echo ""
echo "  2. 能打包什么"
echo "     终端里:    find demos/2-8-plugin-demo -type f | sort"
echo ""
echo "  3. 如何开发（--plugin-dir 本地加载）"
echo "     终端里:    claude --plugin-dir ./demos/2-8-plugin-demo"
echo "     claude 里: /demo-plugin:hello"
echo ""
echo "  4. 实战生成插件"
echo "     claude 里: 粘贴讲义中的 prompt"
echo "     终端里:    find demos/2-8-frontend-review -type f | sort"
echo "     终端里:    claude --plugin-dir ./demos/2-8-frontend-review"
