import { createServerClient } from "@supabase/ssr";

/**
 * Supabase Auth 客户端健康检查。
 *
 * 验证两件事:
 *  1. 环境变量齐全、createServerClient 能初始化(否则抛错并退出码 1);
 *  2. 在"无 session cookie"(即未登录)状态下,auth.getUser() 返回 user: null,
 *     而不是抛异常——这是决策 5 对未登录语义的要求。
 *
 * 脚本不带请求上下文,故不用 next/headers,直接给一个空 cookie 存储;
 * 也不触碰 pg 或 service_role key。
 */

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 未设置。`);
  }
  return value;
}

async function healthcheck(): Promise<void> {
  try {
    const supabase = createServerClient(
      readEnv("SUPABASE_URL"),
      readEnv("SUPABASE_PUBLISHABLE_KEY"),
      {
        cookies: {
          // 无请求上下文:模拟"未登录"——没有任何 auth cookie。
          getAll() {
            return [];
          },
          setAll() {
            // 脚本无响应可写,忽略。
          },
        },
      },
    );

    const { data, error } = await supabase.auth.getUser();

    // 无 session cookie 时,supabase-js 无 token 可验,短路返回
    // user: null + AuthSessionMissingError(不发网络请求)。这正是"未登录"的
    // 预期结果,视为健康。真正的失败是:配置错误、SDK 初始化异常,或意外拿到用户。
    if (data.user === null) {
      const detail = error ? `(${error.name})` : "";
      console.log(
        `[auth:healthcheck] OK — 客户端初始化正常,未登录状态返回 user: null ${detail}`.trim(),
      );
      return;
    }

    console.error(
      "[auth:healthcheck] FAILED — 预期未登录返回 null,实际拿到了用户:",
      data.user.id,
    );
    process.exitCode = 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth:healthcheck] FAILED — 客户端初始化失败:", message);
    process.exitCode = 1;
  }
}

void healthcheck();
