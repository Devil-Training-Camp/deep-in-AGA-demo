/** 可重试错误：LLM 输出不合 schema、TTS 偶发失败等，由调用方决定重试次数。 */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

/** 占位标记：骨架阶段未实现的步骤抛出，提示去对应文档查实现逻辑。 */
export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`未实现：${what}`);
    this.name = "NotImplementedError";
  }
}
