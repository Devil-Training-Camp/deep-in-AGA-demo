/* 极简分级日志。pipeline 各步通过它打印进度，集中在一处便于后续替换实现。 */

type Level = "info" | "warn" | "error" | "step";

const PREFIX: Record<Level, string> = {
  info: "·",
  warn: "⚠",
  error: "✗",
  step: "▸",
};

function emit(level: Level, msg: string): void {
  const line = `${PREFIX[level]} ${msg}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (msg: string) => emit("info", msg),
  warn: (msg: string) => emit("warn", msg),
  error: (msg: string) => emit("error", msg),
  /** 步骤标题，如 "[1/8] 解析与结构化" */
  step: (msg: string) => emit("step", msg),
};
