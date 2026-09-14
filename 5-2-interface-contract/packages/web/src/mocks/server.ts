/**
 * Node 环境(Vitest / 任何服务端测试)下的 MSW 拦截器。
 *
 * 用 msw/node 的 setupServer 在 Node 的网络层拦截请求,配合共享的 handlers,
 * 让针对 lib/api/ 调用层的单测无需真实后端即可跑通成功/错误分支。
 *
 * 生命周期(listen/resetHandlers/close)由各测试的 setup 文件按需接管,这里只导出实例。
 *
 * 注意:handlers 用的是相对路径(/api/...)。浏览器 setupWorker 里相对路径按
 * window.location.origin 解析;Node 里没有 document origin,测试需对 fetch 用
 * 绝对 URL,或注入 globalThis.location 让相对路径可解析(见 handlers 说明)。
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
