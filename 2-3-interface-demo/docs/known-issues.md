# 历史问题记录

> 遇到新问题后用以下 prompt 更新：
> "根据我们刚才的交互，把这个问题总结补充到 docs/known-issues.md，格式参考已有条目。"

---

## 问题 1：按钮颜色硬编码导致主题切换失效

**现象**：切换暗色主题后，按钮颜色没有变化，仍然显示蓝色背景。

**根因**：组件内写了 `style={{ backgroundColor: '#3B82F6' }}`，绕过了 Tailwind class 体系，主题变量无法覆盖。

**解决方案**：一律使用 CLAUDE.md 中的颜色规范表，用 `bg-blue-500` 等 class，禁止 inline style。

**相关代码**：`src/components/Button.tsx` 的 `variantClass` 映射表。

---

## 问题 2：Props 接口缺失导致类型错误漏检

**现象**：组件上线后发现 `onClick` 传入了错误类型的回调，但开发阶段没有报错。

**根因**：Props 用了 `any` 类型，TypeScript 无法检查传入参数的类型是否正确。

**解决方案**：每个组件必须定义独立的 TypeScript Props 接口，绝对禁止 `any`。见 CLAUDE.md 组件规范。
