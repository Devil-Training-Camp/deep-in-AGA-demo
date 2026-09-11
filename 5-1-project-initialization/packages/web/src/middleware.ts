import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 鉴权中间件:每个请求先刷新 Supabase session(把轮转后的 cookie 写回响应),
 * 再对受保护路径做未登录拦截。
 *
 * 授权决策走 getUser()(向 Auth 服务端校验),不信任 cookie 里的 getSession()
 * (architecture-design.md 决策 5)。这里只做"登录与否"的粗粒度门禁;
 * 角色判定(admin)和资源归属(user_id/IDOR)在各 Route Handler 里用
 * requireUser/requireAdmin 二次校验,中间件不越权替代。
 *
 * 只用 publishable key,不碰 service_role key。
 */

// 无需登录即可访问的接口:登录、注册。
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/register"];

function isProtectedApi(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) {
    return false;
  }
  return !PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    // 环境未配置时不放行受保护接口,也不泄漏配置细节。
    return isProtectedApi(request.nextUrl.pathname)
      ? NextResponse.json(
          { error: { code: "SERVER_MISCONFIGURED", message: "服务暂不可用。" } },
          { status: 503 },
        )
      : response;
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // 刷新并校验 session。未登录时 user 为 null(不抛错)。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedApi(request.nextUrl.pathname)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "未登录或登录态已失效。" } },
      { status: 401 },
    );
  }

  return response;
}

export const config = {
  // 跳过静态资源;其余路径都过一遍以保证 session 及时刷新。
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
