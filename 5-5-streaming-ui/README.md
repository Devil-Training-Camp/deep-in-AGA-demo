# 5.5 流式 UI demo

真实可交互的课程示例。默认使用 **MSW 模拟接口**，不会调用模型或数据库。请求与响应对应 5.3 `src/app/api/chat/route.ts` 的自定义 SSE：

- POST `{ knowledgeBaseId, sessionId, question, conversationId? }`
- `event: token` / `{ text }`
- `event: meta` / `{ grounded }`
- `event: done` / `{ conversationId }`
- `event: error` / `{ code, message }`

## 启动与验证

本次复用已有 5.4 的 Next/React 等安装目录，以及 5.2 的 MSW 2.15.0；只在本 demo 建立 node_modules 链接，没有安装新依赖。当前本地运行：

```sh
cd contents/courses/dev-with-ai/demos/5-5-streaming-ui
WATCHPACK_POLLING=true node node_modules/next/dist/bin/next dev -p 3055
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/*.test.ts
```

浏览器打开 `http://localhost:3055`，看到“模拟场景”及可用的发送按钮后即可操作。轮询监听用于绕过本机 Watchpack EMFILE 文件监听上限，不属于应用逻辑。

此课程 demo 未登记为独立 Rush project。移到新机器时依赖需通过仓库认可的 Rush 流程准备，不能把本次本机链接当作可分发的安装产物。本次未运行 Rush 安装或修改工作区依赖。

## 实现分层

| 文件 | 职责 |
| --- | --- |
| `src/lib/chat-stream.ts` | fetch + signal、UTF-8 流解码、buffer 分帧、typed event、异常 EOF |
| `src/store/chat-store.ts` | 单源消息、五个流程状态、转换约束、当前轮次与完整性 |
| `src/hooks/chat-controller.ts` | useChat 的可单独测试调度实现；停止/超时/旧请求隔离 |
| `src/hooks/use-chat.ts` | React 订阅与生命周期适配，不复制消息 |
| `src/components/chat-panel.tsx` | 消息、等待、错误、重试、下一轮及场景选择 |
| `src/components/chat-message.tsx` | 输出/异常/中止用纯文本，正常完成后 Markdown |
| `src/mocks/chat-handlers.ts` | 可控流式场景，分包与断网 |

本机没有 Zustand 安装。状态层使用 `useSyncExternalStore` 订阅自有外部 store，保持讲稿要求的单源数据与三层边界；不是 Zustand 的实际演示。

停止进入 `done + finishReason: aborted`，不增加第六状态。消息保留且标记 `aborted`。每次请求拥有独立 ID，终态先使 ID 失效，再取消 reader；旧 token、catch 和 finally 不得覆盖新轮次。首段文本与助手消息创建在同一次 store 更新中完成。重试保留原问题，只替换本轮未完成助手消息。

## 可复现场景

选择框包含正常、慢速、首段超时、输出空闲超时、已有内容后断网、流内错误、HTTP 401、空答、格式异常。正常场景首段约 600 ms，后续间隔约 480 ms；慢速每段约 2 秒。示例首段阈值为 3 秒、输出空闲阈值为 3.5 秒，**不是产品性能 SLO**。

输出时还可点击“模拟断网”。异常后先把场景切回“正常完成”，再点“再试一次”，检查问题没有重复、旧残答被替换。输入在 thinking/streaming 禁用，其余恢复。停止和重试后可继续下一轮；新会话才清空历史。

浏览器选择器：`[data-testid=flow-status]` 的 `data-state`、`[data-testid=messages]`、`[data-role=assistant]`、标签“输入问题”/“模拟场景”。按钮按名称“发送”“停止生成”“模拟断网”“再试一次”“新会话”定位。

## 真实后端边界

本次没有完成 5.3 后端联调。5.3 的认证代码仍是 `DEV_AUTH_USER_ID` 开发占位，Supabase 正式认证未接通；后端本地 Next 依赖目录也未准备齐。本次没有读取 `.env`，不声称已核实外部数据库或模型凭证。

后端就绪后可设置 `CHAT_BACKEND_ORIGIN=http://localhost:3053` 重启本 demo，然后打开 `http://localhost:3055/?mock=off`。Next rewrite 将 `/api/chat` 代理到后端；fetch 使用 `credentials: include`。该代理配置已实现，尚未作为真实后端集成验证通过。没有配置后端时关闭 Mock 会返回 404，不会静默回退模拟答案。

仍需真实验证发送、停止、下一轮 session/conversation 复用，以及服务端上游取消和持久化；前端停止显示不能证明停止模型计费。重试只保证前端不重复追加问题，无法保证后端幂等性。

## 执行证据

本次运行证据在仓库 `.local/video-workspace/streaming-ui-all-20261122/demo-evidence/`：`execution.jsonl`、逐阶段 `checkpoints/*/{source,changes.diff,manifest.json}`、`logs/*.log`、`evidence.md`。

这是本次 agent 实现记录，时间、命令、退出码与反馈来自实际执行；不是用户原 AI 客户端的录像。浏览器操作与录屏由并行 capture 角色记录。
