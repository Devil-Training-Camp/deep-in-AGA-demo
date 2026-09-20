import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

/**
 * PG 连接与 Drizzle 客户端(单长驻进程,单连接池)。
 *
 * 连接串只从服务端 env 读(CLAUDE.md 安全 P0):绝不硬编码、绝不进前端 bundle。
 * 写路径用 DATABASE_URL;只读探查(如 scripts/probe.ts)另走 DATABASE_URL_READONLY。
 */
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL 未配置(只存服务端 env)");
}

const client = postgres(url, { max: 10 });

export const db = drizzle(client, { schema });
export { schema };
