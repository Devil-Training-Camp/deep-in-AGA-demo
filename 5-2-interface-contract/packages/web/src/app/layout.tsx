import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "智能知识问答系统",
  description: "面向公司内部员工的文档问答系统",
};

// 开发模式 + VITE_USE_MSW=true 时才挂载 MSW 启动器。
// 这里在 Server Component 里判定(可读任意 env);两个条件都是构建期/服务端可知,
// 生产构建下 mswEnabled 恒为 false,对 ./mocks/msw-provider 的动态 import 不会被求值,
// MSW 代码不进生产包。
const mswEnabled =
  process.env.NODE_ENV === "development" && process.env.VITE_USE_MSW === "true";

export default async function RootLayout({ children }: { children: ReactNode }) {
  let mswProvider: ReactNode = null;
  if (mswEnabled) {
    const { MswProvider } = await import("../mocks/msw-provider");
    mswProvider = <MswProvider />;
  }

  return (
    <html lang="zh-CN">
      <body>
        {mswProvider}
        {children}
      </body>
    </html>
  );
}
