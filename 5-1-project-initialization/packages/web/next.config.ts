import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // workspace 包以源码形式被 Next 编译,免去先 build 再引用
  transpilePackages: ["@kb/shared", "@kb/db"],
  typedRoutes: true,
  // pg / pgvector 是 Node 原生模块,不打进任何客户端 bundle
  serverExternalPackages: ["pg", "pgvector"],
};

export default nextConfig;
