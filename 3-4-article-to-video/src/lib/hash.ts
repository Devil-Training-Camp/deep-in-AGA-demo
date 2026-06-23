import { createHash } from "node:crypto";

/** 内容寻址用的稳定哈希：断点续跑靠它判断输入是否变化（technical-design.md §断点续跑）。 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** 对任意可序列化对象取稳定哈希（键排序后再 stringify，避免字段顺序影响结果）。 */
export function hashObject(obj: unknown): string {
  return sha256(stableStringify(obj));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}
