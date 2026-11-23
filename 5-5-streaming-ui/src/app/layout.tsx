import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "智能知识问答系统",
  description: "AI 知识问答系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
