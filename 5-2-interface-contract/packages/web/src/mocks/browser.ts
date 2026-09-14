/**
 * 浏览器环境下的 MSW 拦截器(Service Worker)。
 *
 * 用 msw/browser 的 setupWorker 在浏览器网络层拦截 fetch/XHR,配合共享 handlers,
 * 让前端在没有真实后端时也能开发联调:相对路径(/api/...)会按当前页面 origin 解析,
 * 因此 dev server 跑在任意端口都无需改 handler。
 *
 * worker 的启动只发生在开发模式且显式开启开关时,统一收在 ./index 的 enableMocking 里,
 * 这里只导出实例,不做副作用。启动依赖 public/mockServiceWorker.js(由 msw init 生成)。
 */

import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
