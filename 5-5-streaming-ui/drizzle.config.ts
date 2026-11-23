import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dbCredentials: {
    // 连接串只存服务端 env(CLAUDE.md 安全 P0),不硬编码。
    url: process.env.DATABASE_URL!,
  },
  // pgvector 扩展:drizzle-kit 不会自动产出 CREATE EXTENSION,
  // 生成后需手动在首个迁移头部补 `CREATE EXTENSION IF NOT EXISTS vector;`。
  extensionsFilters: ["postgis"],
});
