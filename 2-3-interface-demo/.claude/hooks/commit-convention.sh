#!/bin/bash
# Hook: UserPromptSubmit
# 作用：检测到 commit/提交 关键词时，自动注入 Conventional Commits 规范
#
# 配置方式（在 .claude/settings.json 的 hooks 字段中添加）：
# "hooks": {
#   "UserPromptSubmit": [
#     {
#       "matcher": "",
#       "hooks": [{ "type": "command", "command": "bash .claude/hooks/commit-convention.sh" }]
#     }
#   ]
# }

INPUT=$(cat)

if echo "$INPUT" | grep -iEq "commit|提交|git commit|提交代码|提交改动"; then
  cat << 'EOF'

[规范注入] 请严格遵循 Conventional Commits 规范生成 commit message：

格式：<type>(<scope>): <description>

type 必须从以下选项中选择：
  feat     新功能
  fix      修复 bug
  chore    构建/工具/依赖变动（不影响业务代码）
  docs     文档更新
  refactor 重构（不新增功能，不修复 bug）
  style    代码格式调整（不影响逻辑）
  test     测试相关

规则：
  - description 使用英文，小写开头，不加句号
  - scope 可选，用括号包裹，表示影响范围（如 button、auth）
  - 不超过 72 个字符

示例：
  feat(button): add danger and success variants
  fix(auth): correct password min-length validation
  chore: upgrade tailwind to v3.4.0

EOF
fi
