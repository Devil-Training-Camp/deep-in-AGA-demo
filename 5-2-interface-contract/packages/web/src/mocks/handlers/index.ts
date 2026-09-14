/**
 * MSW handler 汇总。按接口模块分文件,这里拼成一个扁平数组交给 setupWorker/setupServer。
 *
 * 每个 handler 默认走成功分支;请求带 `?mock=error` 时切到该接口的错误 handler
 * (见各文件与 ../helpers 的 isErrorMode),方便本地演练加载失败/空态/错误态 UI。
 *
 * 刻意不含 POST /api/chat:它是 text/event-stream 的 SSE 流式接口,mock 方式与
 * 这些 JSON 接口不同(要模拟 meta→token→done 的逐帧推送),单独处理。
 */

import { adminHandlers } from "./admin";
import { authHandlers } from "./auth";
import { conversationHandlers } from "./conversations";
import { documentHandlers } from "./documents";
import { knowledgeBaseHandlers } from "./knowledge-bases";

export const handlers = [
  ...authHandlers,
  ...knowledgeBaseHandlers,
  ...documentHandlers,
  ...conversationHandlers,
  ...adminHandlers,
];

export {
  adminHandlers,
  authHandlers,
  conversationHandlers,
  documentHandlers,
  knowledgeBaseHandlers,
};
