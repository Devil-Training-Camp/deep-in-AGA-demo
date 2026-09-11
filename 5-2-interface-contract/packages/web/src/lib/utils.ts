import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn/ui 约定的类名合并工具:clsx 处理条件类名,tailwind-merge 消解
 * Tailwind 冲突类(如同时出现 px-2 与 px-4 时保留后者)。
 * 所有 shadcn 组件都从 @/lib/utils 引用它,勿改签名与导出名。
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
