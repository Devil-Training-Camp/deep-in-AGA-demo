# Git 线性历史可视化 Demo

> 对应文章：[一条直线：为什么团队应该保持 Git 线性提交历史](../../drafts/linear-history.md)

## 这个 Demo 演示什么

通过三个交互式面板，直观对比线性 vs 非线性 Git 提交历史的差异，以及不同 merge 策略和 git bisect 效率的影响。

## 运行方式

```bash
pnpm install
pnpm --filter @demos/0-2-linear-history run dev
```

## 演示要点

- **历史对比**：并排展示 merge commit "铁轨图" vs squash merge 干净历史的视觉差异
- **合并策略**：切换 Merge / Rebase / Squash 三种策略，观察同一 feature 分支合入后 main 的变化
- **Bisect 效果**：逐步模拟 bisect 定位 bug 的过程，对比线性/非线性历史下的步骤数量差异
