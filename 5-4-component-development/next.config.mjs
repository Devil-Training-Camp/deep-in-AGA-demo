/** @type {import('next').NextConfig} */
const nextConfig = {
  // 本 demo 聚焦组件搭建，未纳入 ESLint 依赖；关掉构建期 lint 以免噪音。
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
