import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

/**
 * PG 连接池单例。连接串只来自服务端环境变量 DATABASE_URL,绝不硬编码
 * (CLAUDE.md 密钥保护:PG 连接串泄漏可绕过全部 API 鉴权直取全库明文)。
 *
 * 复用 Railway 托管的 PostgreSQL 14,不引入新的独立服务(tech-selection.md §2)。
 */
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL 未设置:连接串只走服务端环境变量,不得硬编码。");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

/**
 * 参数化查询入口。业务层一律走此函数传参,严禁字符串拼接 SQL,
 * 也严禁 SELECT *(见根 .eslintrc.json 的 no-restricted-syntax 规则)。
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params ? [...params] : undefined);
}

/** 需要事务时取一个 client,调用方负责 release。 */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
