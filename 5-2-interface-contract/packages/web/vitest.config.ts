import { defineConfig } from "vitest/config";

// 只测 lib 里的纯逻辑单元(API 基础层等),不拉起 Next 运行时。
// node 环境即可:axios 的自定义 adapter 让测试完全脱离真实网络。
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
