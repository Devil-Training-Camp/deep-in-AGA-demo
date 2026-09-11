import { NextResponse } from "next/server";

// 注册 / 登录入口(architecture-design.md 决策 5:邮箱+密码自建账号、JWT)。
// 唯二无鉴权入口,须限流:login 按 IP/账号限失败次数,register 按拍板的开放度约束
// (nonfunctional-requirements.md P0 认证入口限流)。具体实现见后续章节。
export function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
