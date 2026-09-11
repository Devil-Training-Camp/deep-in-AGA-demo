import { closePool, query } from "./client.js";

/**
 * 连接自检:对 Railway 托管的 PostgreSQL 执行一条最小查询,确认连接串可用。
 *
 * 这是向量方案的前置地基自检(architecture-design.md 待确认项 4):pgvector 落地前,
 * 先确认应用能连上库。连接串只来自 DATABASE_URL(见 client.ts),此处不碰任何密钥。
 *
 * 用 `SELECT 1` 而非读业务表:自检只验证「连得上、能执行」,不依赖任何表已建好。
 */
async function healthcheck(): Promise<void> {
  try {
    const result = await query<{ ok: number }>("SELECT 1 AS ok");
    if (result.rows[0]?.ok === 1) {
      console.log("[db:healthcheck] OK — 数据库连接正常。");
    } else {
      // 连上了但结果不符预期,当失败处理,便于尽早暴露异常环境。
      console.error("[db:healthcheck] FAILED — 查询返回异常:", result.rows);
      process.exitCode = 1;
    }
  } catch (err) {
    // 只打印错误消息,不打印连接串/堆栈里可能夹带的敏感信息(CLAUDE.md:密钥不进日志)。
    const message = err instanceof Error ? err.message : String(err);
    console.error("[db:healthcheck] FAILED — 无法连接数据库:", message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

void healthcheck();
