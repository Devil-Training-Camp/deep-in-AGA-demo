---
name: deploy-to-prod-safe
description: Deploy application to production environment. Use when user wants to deploy, release, or publish the application to production.
disable-model-invocation: true
allowed-tools: Bash(vercel *), Bash(git *), Read
argument-hint: [environment]
---

# 生产环境部署（安全版本）

✅ 设置了 disable-model-invocation: true，Claude 不会自动触发。
只有用户手动执行 /deploy-to-prod-safe 才会运行。

## 执行步骤

1. 检查当前分支是否为 main
2. 运行完整测试套件
3. 构建生产包
4. 执行部署

```bash
git status
git log --oneline -5
npm test && npm run build
vercel --prod $0
```

## 注意事项

- 只在测试全部通过后继续部署
- 确认当前分支是 main 或 release 分支
- 记录部署时间和版本号
