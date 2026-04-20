---
name: deploy-to-prod
description: Deploy application to production environment. Use when user wants to deploy, release, or publish the application to production.
allowed-tools: Bash
---

# 生产环境部署

⚠️ 这是一个【没有设置 disable-model-invocation】的示例 Skill。
Claude 会在你说"我想部署"时自动触发这个 Skill。

## 执行步骤

1. 运行测试确保代码质量
2. 构建生产包
3. 部署到生产环境

```bash
npm test
npm run build
# vercel --prod
```

> 演示说明：这个 Skill 刻意省略了 disable-model-invocation: true，
> 用于对比展示没有保护时 Claude 的行为。
