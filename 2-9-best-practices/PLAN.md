# 实现用户编辑表单(验证 + 提交 + 错误处理)

## Context

`demos/2-9-best-practices` 目前是一个纯演示项目:只有规范文档(`.claude/rules/*.md`)、Hooks 配置和一个空的 `src/utils.ts`,**没有任何可运行的应用脚手架**(无 `package.json`、Vite、React 入口)。

本次目标是按确认的范围,在该 demo 内从零搭建一个可运行的 Vite + React + TS + Tailwind 应用,并实现一个用户编辑表单。这个表单要同时演示三类能力:**客户端验证**(React Hook Form + Zod)、**Mock 提交**(TanStack Query `useMutation`)、**错误处理**(字段级内联错误 + 提交失败横幅 + 服务端字段错误回填)。

实现严格遵循 `.claude/rules/frontend.md`:函数组件、单组件 <200 行、服务端数据走 TanStack Query、表单用 React Hook Form + Zod、Tailwind 样式、禁止 `any`、API 响应用 Zod 做运行时校验。

确认的范围:

- **完整搭建可运行**(`pnpm dev` 能在浏览器看到效果)
- **Mock 提交**(不接真实 Fastify 后端)
- 字段:**姓名(name)+ 邮箱(email)+ 简介(bio)**

## 脚手架(对齐 `demos/1-0-quick-start` 模板)

新增以下配置文件,版本与配置风格直接复用 `1-0-quick-start`:

- `package.json` — name 用 `@demos/2-9-best-practices`,`type: module`,scripts: `dev`/`build`/`test`
- `vite.config.ts`、`tsconfig.json`、`postcss.config.js`、`tailwind.config.js`、`index.html`(标题改为「2.9 最佳实践演示」)

依赖在 `1-0-quick-start` 基础上**新增**(运行时):`@tanstack/react-query`、`react-hook-form`、`zod`、`@hookform/resolvers`。React 仍用 `^18.2.0`。

**刻意不引入** Zustand(本表单无全局 UI 状态)和 Radix UI(姓名/邮箱/简介均为纯文本输入,headless 组件用不上)——保持依赖最小化,与本 demo「代码最小化」主题一致。若后续加 role 下拉再引入 Radix。

> 注意:`src/utils.ts` 是演示三的空白起点,**保持不动**,不要删除或写入。

## 实现结构

```
src/
  main.tsx              # 入口:用 QueryClientProvider 包裹 App
  App.tsx               # 演示容器,渲染 <UserEditForm/>
  index.css             # tailwind 三条指令
  schemas/user.ts       # Zod schema + 推导类型(唯一数据契约来源)
  lib/mockApi.ts        # mock 异步:getUser / updateUser,模拟延迟与失败
  hooks/useUser.ts      # useQuery 拉取当前用户(编辑表单的初始值)
  hooks/useUpdateUser.ts# useMutation 封装 mock 提交
  components/UserEditForm.tsx  # 表单主组件(<200 行)
  components/FormField.tsx     # label+input+error 的可复用字段封装,避免重复
```

### `src/schemas/user.ts`(数据契约)

- `UserProfileSchema`:`name`(min 1,必填)、`email`(`.email()`)、`bio`(可选,max 200)
- 用 `z.infer` 导出 `UserProfile` 类型,前后端/表单共用,避免手写 interface
- `updateUserResponseSchema`:mock 返回值用它 `.parse()` 做运行时校验(落实 frontend.md「API 响应必须有 Zod schema 做运行时校验」)
- mock 错误响应遵循 backend.md 统一格式 `{ code: string, message: string }`

### `src/lib/mockApi.ts`(Mock 提交,内置可演示的失败路径)

- `getUser()`:`setTimeout` 模拟网络延迟后返回一个预置用户(供编辑表单回填)
- `updateUser(input)`:模拟延迟;当 `email === 'taken@example.com'` 时 reject 一个 `{ code: 'EMAIL_TAKEN', message: '该邮箱已被占用' }`(演示服务端字段错误),其余情况校验后 resolve。让三种错误场景都能手动触发。

### `src/hooks/`(TanStack Query)

- `useUser.ts`:`useQuery` 调 `getUser`,暴露 `data`/`isLoading`,用于设置表单 `defaultValues`
- `useUpdateUser.ts`:`useMutation` 调 `updateUser`,暴露 `mutate`/`isPending`/`error`/`isSuccess`

### `src/components/UserEditForm.tsx`(三类能力的落点)

- `useForm<UserProfile>({ resolver: zodResolver(UserProfileSchema) })`,初始值来自 `useUser`(加载中显示 loading 占位)
- **验证**:`zodResolver` 驱动字段级内联错误(空姓名、非法邮箱、简介超长),通过 `FormField` 展示 `errors.xxx.message`
- **提交**:`handleSubmit` → `useUpdateUser().mutate`,提交中按钮禁用并显示 pending
- **错误处理**三层:
  1. 客户端校验失败 → 内联字段错误
  2. 提交返回 `EMAIL_TAKEN` → 用 RHF `setError('email', ...)` 把服务端错误回填到对应字段
  3. 其它提交失败 → 顶部错误横幅展示 `{ message }`;成功 → 成功提示并 `reset` 脏状态

### `src/components/FormField.tsx`

- 接收 `label` + `error?` + 通过 `register` 注入的 input props,统一渲染标签、输入框、错误文案,使 `UserEditForm` 保持精简(<200 行)。props 明确类型,无 `any`。

## 关键文件

- 新增配置:`package.json`、`vite.config.ts`、`tsconfig.json`、`postcss.config.js`、`tailwind.config.js`、`index.html`
- 新增源码:`src/main.tsx`、`src/App.tsx`、`src/index.css`、`src/schemas/user.ts`、`src/lib/mockApi.ts`、`src/hooks/useUser.ts`、`src/hooks/useUpdateUser.ts`、`src/components/UserEditForm.tsx`、`src/components/FormField.tsx`
- 模板参考:`demos/1-0-quick-start/`(各配置文件)
- 规范依据:`demos/2-9-best-practices/.claude/rules/frontend.md`、`backend.md`
- 保持不动:`src/utils.ts`

## 验证

1. 安装依赖:仓库根目录执行 `pnpm install`
2. 启动:`pnpm --filter @demos/2-9-best-practices run dev`,浏览器打开 Vite 提示的地址
3. 手动验证三类能力:
   - **验证**:清空姓名提交 → 姓名下方报「必填」;邮箱填 `abc` → 报邮箱格式错误;简介超 200 字 → 报超长
   - **提交成功**:填合法数据提交 → 按钮变 pending → 出现成功提示
   - **提交失败/字段回填**:邮箱填 `taken@example.com` 提交 → 邮箱字段下出现「该邮箱已被占用」(服务端错误回填);可临时改 mock 触发通用失败,验证顶部错误横幅
4. 类型与构建:`pnpm --filter @demos/2-9-best-practices run build`(`tsc && vite build`)通过,确认无 `any`、无类型错误
