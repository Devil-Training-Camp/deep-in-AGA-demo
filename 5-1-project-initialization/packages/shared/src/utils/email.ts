/** 邮箱域名提取:日志/埋点需要邮箱时降级为域名,不打印完整邮箱(CLAUDE.md 敏感字段脱敏)。 */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1) : "";
}
