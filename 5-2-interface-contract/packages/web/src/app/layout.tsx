import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "智能知识问答系统",
  description: "面向公司内部员工的文档问答系统",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
