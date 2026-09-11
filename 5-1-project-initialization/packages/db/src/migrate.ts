import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getClient, closePool } from "./client.js";

/**
 * 极简 migration runner:按文件名顺序执行 migrations/*.sql。
 *
 * 不引入 knex / prisma —— Prisma 不支持 pgvector 的 vector 类型
 * (CLAUDE.md 一、技术栈约束),向量相关 DDL 与检索都走原生 SQL。
 * 已执行的迁移记录在 schema_migrations 表,重复执行幂等。
 */
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function ensureMigrationsTable(): Promise<void> {
  const client = await getClient();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  } finally {
    client.release();
  }
}

async function appliedMigrations(): Promise<Set<string>> {
  const client = await getClient();
  try {
    const { rows } = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations",
    );
    return new Set(rows.map((r) => r.filename));
  } finally {
    client.release();
  }
}

async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const done = await appliedMigrations();

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    if (done.has(file)) {
      console.log(`skip  ${file} (已执行)`);
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    const client = await getClient();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`apply ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

runMigrations()
  .then(() => closePool())
  .then(() => {
    console.log("migrations 完成");
  })
  .catch(async (err: unknown) => {
    console.error("migrations 失败:", err);
    await closePool();
    process.exit(1);
  });
