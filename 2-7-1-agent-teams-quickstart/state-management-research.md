# 状态管理方案综合调研报告

**调研方案**：Zustand · Redux Toolkit · Jotai  
**调研团队**：技术专家 · 产品经理 · 架构师  
**日期**：2026-06-04

---

## 一、各维度核心发现

### 技术维度

**Bundle 体积**差距悬殊：Zustand 486B（gzip）、Jotai ~4KB、RTK 13.6KB。在 3G 网络下，RTK 与 Zustand 的体积差相当于约 100ms 的 TTI 损失，对首屏敏感的项目不可忽视。

**性能基准**（React Advanced 2025，1000 组件订阅场景）：Zustand 约 12ms、Jotai 约 14ms、RTK 约 18ms。大数据流场景下 Jotai 的原子模型更占优，渲染耗时约 2s vs Zustand/RTK 的约 4s。在复杂表单（30+ 字段）场景中，Zustand 配合 computed selectors 可将更新耗时从原生 React 的 220ms 压到 85ms。

**React 18+ 兼容性**是关键分水岭：Jotai 基于 `useState` 内核，原生支持 Suspense 和 `useTransition`；Zustand 和 RTK 均使用 `useSyncExternalStore`，在 Concurrent Mode 下存在 de-opt，无法正确显示 transition pending 状态，会直接触发 Suspense fallback。

**API 设计**：三者分属不同范式——RTK 延续 Flux 单一 store + reducer + action；Zustand 走极简 hook 路线，无 Provider、无 reducer，API 表面最小；Jotai 完全模仿 `useState`，原子化组合。TypeScript 支持上三者均原生 TS，Jotai 的类型推断最自然。

### 产品维度

**迁移成本**（从现有 Redux 方案）：

- **Zustand**：样板代码减少约 60%，渲染性能提升约 25%。可采用渐进式策略——新模块先引入，与 Redux 并行共存，再逐域替换，每个 slice 三件套（actions/reducers/types）可合并为不到 30 行的 store hook。
- **Redux Toolkit**：严格意义上是"升级"而非迁移，兼容现有结构，工作量可控但收益有限。
- **Jotai**：原子模型与单一 store 思维完全相反，几乎等同于重写状态层，不建议作为 Redux 项目的整体替代。

**团队学习曲线**：

| 维度 | Zustand | Redux Toolkit | Jotai |
|------|---------|---------------|-------|
| 核心概念数 | 1（store hook） | 5（store/slice/action/reducer/selector） | 3（atom/derived atom/provider） |
| 上手时间 | 0.5 天 | 2-3 天 | 1-2 天（但思维转换难） |
| 文档质量 | 简洁清晰 | 详尽完备 | 完备但示例偏理论 |

有 Redux 背景的开发者 30 分钟即可掌握 Zustand，本质是去掉 Provider/dispatch/connect 的"Redux Lite"。Jotai 的难点不在 API，而在从"集中式 store"到"原子依赖图"的心智模型转换，对人员流动较大的团队是隐性成本。

**DevTools 调试体验**梯度明显：RTK 五星（时间旅行、action 日志、状态 diff）、Zustand 四星（通过 middleware 复用 Redux DevTools）、Jotai 三星（jotai-devtools 成熟度不足）。

**社区数据**（截至 2026 年 3 月）：

- Zustand：GitHub Stars ~56K，周下载量 8.4M-14.2M，同比增长 30%+，出现在约 40% 的新项目中
- Redux Toolkit：Stars ~11K，周下载量 4.3M-9.8M，持续活跃维护
- Jotai：Stars ~20.8K，周下载量 1.07M；Recoil 已于 2025 年 1 月归档，但 Jotai 由 Poimandres 团队维护（同 Zustand、Valtio、React Spring），短期归档风险低

### 架构维度

**扩展性**：RTK 的 feature slice 模式天然支持多团队并行开发，不同团队负责的 slice 互不干扰，支持动态 reducer 注入实现按路由懒加载。Zustand 自由度高但缺乏约束，50+ 模块时需团队自行制定规范，否则维护成本非线性上升。Jotai 的 atom 网络在数百个相互派生时依赖关系图难以追踪。

**维护性**：RTK 的时间旅行调试和单向数据流强约束使得状态变化高度可预测，代码可读性随规模增长保持稳定。Zustand 通过 devtools middleware 接入 Redux DevTools，但 action 语义不如 RTK 明确（`set` 调用没有显式 action type），时间旅行体验打折扣。Jotai 的 DevTools 生态最弱。

**生态成熟度**：RTK 生态最完整（RTK Query + Redux Persist + Saga/Thunk），与 React Router、MSW、测试工具集成成熟。Zustand 核心中间件覆盖 persist/immer/subscribeWithSelector，通常搭配 TanStack Query 处理服务端状态。Jotai 提供官方集成包（jotai-tanstack-query、jotai-immer）但社区深度不及前两者。

**适用场景边界**：

- RTK：50+ 模块的企业级应用、5 人以上多团队协作、对调试可追溯性要求高的场景（金融、电商交易流程）
- Zustand：中小型 SPA（<30 模块）、3-5 人小团队、UI 状态为主、服务端状态交给 React Query 的场景
- Jotai：状态高度细粒度且互相派生的应用（设计工具、电子表格、复杂表单生成器、实时协作编辑器）

---

## 二、跨角色分歧与讨论

### 分歧 1：Zustand 是否足够应对中大型项目？

**技术专家**认为 Zustand 在性能和 bundle 上是"最佳平衡点"，2025 年 React 调研使用率已破 50%。

**架构师**提出反驳：使用率高不等于适用于大型项目——50+ 模块的应用里，Zustand 缺乏强约束会导致 store 结构退化，维护成本非线性上升。

**结论**：双方均认可 Zustand 在 30 模块以内是最优解；超过这个规模，团队需要主动制定并强制执行 store 组织规范，或考虑引入 RTK。

### 分歧 2：RTK 的体积劣势是否被高估？

**技术专家**强调 13.6KB 的 bundle 差距在首屏敏感场景不可忽视。

**架构师**反驳：企业级应用通常不是首屏敏感场景，且 RTK Query 替代 React Query 后实际减少了总 bundle——RTK + RTK Query 的整体体积不一定比 Zustand + TanStack Query 更大。

**结论**：需按实际技术栈整体计算 bundle，单独比较状态管理库体积会产生误导。

### 分歧 3：Jotai 的 React 18+ 优势是否足以成为首选？

**技术专家**认为 Jotai 是唯一在 Concurrent Mode 下无妥协的选项，随着 React 19 普及这个优势会越来越重要。

**架构师 + 产品经理**共同提出：Jotai 的 DevTools 弱势和 atom 依赖图追踪难题，在实际生产中造成的维护痛点可能超过 concurrent 兼容性带来的收益。产品经理补充：迁移成本几乎等同于重写状态层，投入产出比不合算。

**结论**：Jotai 的 concurrent 优势在特定场景（设计工具、复杂表单、实时协作）是决定性的；通用型应用中，DevTools 和迁移成本的劣势抵消了技术优势。

---

## 三、综合推荐矩阵

| 场景 | 推荐方案 | 核心理由 |
|------|---------|---------|
| 小型 SPA / 原型 / 内部工具 | **Zustand** | 极小 bundle、上手 0.5 天、无样板代码 |
| 中型应用（5-30 模块） | **Zustand + TanStack Query** | 职责分离清晰，开发效率最高 |
| 大型企业应用（50+ 模块，多团队） | **Redux Toolkit** | 强约束保证代码质量，调试能力最完整 |
| 复杂表单 / 设计工具 / 实时协作 | **Jotai** | 原子粒度性能优势 + Concurrent Mode 完整支持 |
| 重 Server State 场景 | **RTK + RTK Query** | 一体化方案减少多库协调复杂度 |
| 从 Redux 迁移（保守路线） | **Redux Toolkit** | 兼容现有结构，渐进升级 |
| 从 Redux 迁移（激进路线） | **Zustand** | 样板代码 -60%，渲染性能 +25% |

---

## 四、迁移路径建议

如果当前使用 Redux（非 RTK），渐进式路径优先于大规模重构：

1. **第一步**：引入 RTK，用 `createSlice` 替换现有 reducer，无需改变架构
2. **第二步**：评估团队规模和模块数量——若 ≤30 模块，可同步引入 Zustand 处理 UI 状态，RTK 保留全局业务状态
3. **第三步**：若出现细粒度性能瓶颈（如大型表格、复杂表单），局部引入 Jotai 管理对应模块

### 最终选型决策树

```
新项目选型？
├── 团队 ≤5 人 / 模块 ≤30 → Zustand（默认起点）
├── 团队 >10 人 / 多团队协作 → Redux Toolkit
└── 存在复杂表单/设计工具/实时协作场景 → Jotai（局部或全局）

从 Redux 迁移？
├── 保守路线 → 升级到 RTK（兼容现有结构）
├── 激进路线 → 渐进迁移到 Zustand（-60% 样板代码）
└── 不建议 → 整体迁移到 Jotai（成本过高）
```

---

## 五、最终结论

三种工具并非互斥。**RTK 管全局业务状态 + TanStack Query 管服务端状态 + Jotai 管局部精细状态**是当前社区验证过的成熟分层模式，三方专家均认可这一实践。

没有绝对最优方案，只有最匹配场景的方案。**Zustand 是 2026 年大多数新项目的默认起点**：bundle 最小、上手最快、生态活跃、中等规模下性能足够。当项目规模扩大或出现明确的调试/协作痛点时，向 RTK 演进是有充分支撑的决策；当项目场景明确需要 Concurrent Mode 完整能力或极细粒度渲染优化时，Jotai 是唯一无妥协选项。

务实的渐进路径：**Zustand 起步 → 团队规模或调试痛点出现时迁移 RTK → 出现精细化性能瓶颈时引入 Jotai**。

---

## 数据来源

- [Better Stack: Zustand vs Redux Toolkit vs Jotai](https://betterstack.com/community/guides/scaling-nodejs/zustand-vs-redux-toolkit-vs-jotai/)
- [State Management in 2026 - DEV Community](https://dev.to/jsgurujobs/state-management-in-2026-zustand-vs-jotai-vs-redux-toolkit-vs-signals-2gge)
- [Frontend System Design: Redux Toolkit vs Zustand vs Jotai - DEV](https://dev.to/zeeshanali0704/frontend-system-design-redux-toolkit-vs-zustand-vs-jotai-1npn)
- [GitNation: State Wars Benchmarking (React Advanced 2025)](https://gitnation.com/contents/state-wars-benchmarking-state-management-strategies-in-data-heavy-react-apps)
- [Daishi Kato's blog: Why useSyncExternalStore Is Not Used in Jotai](https://blog.axlight.com/posts/why-use-sync-external-store-is-not-used-in-jotai/)
- [Migrating from Redux to Zustand Guide](https://tillitsdone.com/blogs/redux-to-zustand-migration-guide/)
- [Scalable React State Management - Medium](https://medium.com/@ancilartech/large-scale-apps-101-redux-zustand-jotai-or-recoil-for-scalable-react-state-management-cebcd77e24a3)
- [State Management in 2025 - Medium](https://medium.com/@pooja.1502/state-management-in-2025-redux-toolkit-vs-zustand-vs-jotai-vs-tanstack-store-c888e7e6f784)
- [npmtrends - 四库对比](https://npmtrends.com/jotai-vs-react-redux-vs-redux-toolkit-vs-zustand)
- [Jotai 官方文档 - Comparison](https://jotai.org/docs/basics/comparison)
- [Redux Style Guide（官方）](https://redux.js.org/style-guide/)
