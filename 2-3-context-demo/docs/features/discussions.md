# 需求说明：讨论模块（Discussions）

> 来源：代码库 `src/features/discussions/`
> 提炼方式：从 API 定义、组件实现、路由配置中提取，保留研发所需内容

---

## 核心功能点

1. 讨论列表：分页展示当前团队的所有讨论，支持按页码翻页
2. 发起讨论：填写标题和正文，提交后立即出现在列表首页
3. 查看讨论详情：展示完整正文，以及该讨论下的所有评论
4. 编辑讨论：仅作者可编辑，修改标题或正文
5. 删除讨论：仅作者可删除，同时级联删除该讨论下的所有评论
6. 评论功能：在讨论详情页添加/删除评论（见 `comments` feature）

## 业务约束

- 所有操作需要登录：未登录用户访问任何讨论页面，重定向到登录页，登录成功后回跳
- 多租户隔离：每条讨论归属于一个 team，用户只能看到自己所在 team 的讨论
- 权限控制：编辑和删除操作只对讨论的创建者开放；角色为 `ADMIN` 的用户可操作所有内容（`User.role: 'ADMIN' | 'USER'`）
- 分页规则：每页固定返回 N 条，当前页由 URL 参数 `?page=N` 控制，缺省为第 1 页

## 关键接口

```
GET /api/discussions?page={n}
响应：{
  data: Discussion[],
  meta: { page: number, total: number, totalPages: number }
}

GET /api/discussions/:id
响应：Discussion

POST /api/discussions
请求：{ title: string（必填，非空）, body: string（必填，非空）}
响应：Discussion

PATCH /api/discussions/:id
请求：{ title?: string, body?: string }
响应：Discussion

DELETE /api/discussions/:id
响应：{ id: string }
错误：{ message: "Unauthorized" }（非作者操作时）
```

Discussion 数据结构：

```typescript
type Discussion = {
  id: string;
  title: string;
  body: string;       // Markdown 格式，前端用 marked + DOMPurify 渲染（防 XSS）
  teamId: string;
  author: User;       // 内嵌完整用户对象，不是 authorId
  createdAt: number;  // Unix 时间戳（毫秒）
}
```

## 验收标准

- [ ] 未登录用户访问讨论页面，重定向到登录页，登录后回跳原页面
- [ ] 发起讨论后，不刷新页面即可在列表中看到新条目（TanStack Query 缓存失效）
- [ ] 翻页操作通过 URL `?page=N` 控制，刷新后仍保持当前页
- [ ] 删除讨论后，列表页立即消失（不需要手动刷新）
- [ ] 非作者看不到"编辑"和"删除"入口
