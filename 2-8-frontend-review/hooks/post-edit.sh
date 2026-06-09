#!/bin/bash
# PostToolUse(Write|Edit)钩子:每次写入/编辑文件后触发。
# 若改动的是 .ts/.tsx 文件,提示运行 /frontend-review:check 做前端审查。
# stdin 是事件 JSON,这里用轻量解析,不依赖 jq。
payload="$(cat)"
file_path="$(printf '%s' "$payload" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"

case "$file_path" in
  *.ts|*.tsx)
    echo "📝 已修改前端文件:${file_path##*/} —— 建议运行 /frontend-review:check 做类型与无障碍审查"
    ;;
esac
exit 0
