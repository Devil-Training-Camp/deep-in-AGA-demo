"use client";

/**
 * 客户端 MSW 启动器。挂载即调用 {@link enableMocking} 拉起浏览器 worker,自身不渲染任何 UI。
 *
 * 为什么单拆一个客户端组件:MSW 的 Service Worker 只存在于浏览器,启动必须在客户端;
 * 而 RootLayout 是 Server Component。由 layout 判定开关后,仅在命中时才渲染本组件,
 * 从而把"是否加载 MSW"的决策留在服务端,客户端只负责执行启动副作用。
 */

import { useEffect } from "react";
import { enableMocking } from "./index";

export function MswProvider() {
  useEffect(() => {
    void enableMocking();
  }, []);

  return null;
}
