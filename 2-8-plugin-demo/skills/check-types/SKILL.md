---
name: check-types
description: 对当前前端工程运行 TypeScript 类型检查,汇总并定位类型错误。当用户想确认改动是否引入类型问题、或提交前做静态校验时使用。
argument-hint: "[目标目录,默认当前工程]"
allowed-tools: "Bash Read Grep"
---

调用方式:`/frontend-review:check-types`

按以下步骤执行类型检查,目标范围为 `$ARGUMENTS`(为空则取当前工作目录):

1. 探测工程使用的包管理器:存在 `pnpm-lock.yaml` 用 pnpm,`yarn.lock` 用 yarn,否则用 npm。
2. 运行类型检查,不产出文件:`<pm> exec tsc --noEmit`。若工程在 `package.json` 中已有 `typecheck`/`type-check` 脚本,优先调用该脚本。
3. 解析输出,把错误按文件聚合,每条给出 `文件:行号` 与简明原因。
4. 对前三个错误读取对应源码上下文,给出具体修复建议(优先类型收窄、补全类型声明,而非 `as any`)。
5. 最后用一句话给出结论:通过 / 共 N 处类型错误待修复。

注意:只做检查与建议,不直接改写业务代码,除非用户明确要求。
