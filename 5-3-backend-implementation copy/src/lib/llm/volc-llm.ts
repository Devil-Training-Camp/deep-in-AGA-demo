import type { LLMProvider, LLMMessage } from "./index.ts";

/**
 * 火山方舟 LLM 实现 —— 只实现 LLMProvider 契约(streamChat + rewrite)。
 *
 * 分工(2026-09-15 拍板):LLM 生成/改写与 embedding 均走火山方舟(Volcano Ark)。
 * 火山方舟的 /chat/completions 是 OpenAI 兼容格式,故请求/SSE 解析与 OpenAI 一致;
 * 但生成与向量是两条独立链路、两套 env(LLM_* / EMBEDDING_*),故拆成两个文件。
 *
 * 红线:
 *   - streamChat 的 signal 必须透传给上游 fetch —— 前端中断即取消上游、停止计费(SSE 止损)。
 *   - 密钥只从 process.env 运行时读取,绝不硬编码 / 进日志 / 进前端 bundle。
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`环境变量 ${name} 未配置(火山 LLM 依赖)`);
  }
  return v.trim();
}

/** rewrite 用的系统提示:把带指代的追问改写成可独立检索的完整问题。 */
const REWRITE_SYSTEM_PROMPT =
  "你是检索前置的问题改写器。结合对话历史,把用户最新的追问改写成一个不依赖上下文、" +
  "语义完整、可独立用于向量检索的问题。只输出改写后的问题本身,不要解释、不要引号。";

export class VolcLLMProvider implements LLMProvider {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    // 不用 TS 参数属性(strip-types 不支持)。
    this.endpoint = requireEnv("LLM_BASE_URL").replace(/\/$/, "") + "/chat/completions";
    this.apiKey = requireEnv("LLM_API_KEY");
    this.model = requireEnv("LLM_MODEL");
  }

  /**
   * 流式生成。signal 透传上游;前端 abort → fetch 抛 AbortError,由调用方(SSE 层)
   * 感知并停止。逐块 yield 文本增量(不含控制帧),交给 SSE 层封装成 event。
   */
  async *streamChat(messages: LLMMessage[], signal: AbortSignal): AsyncIterable<string> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
      signal, // ← 中断止损:透传给上游 fetch
    });

    if (!res.ok || !res.body) {
      throw new Error(`火山 流式请求失败: HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // OpenAI SSE:按行切,data: 开头的是一帧;[DONE] 结束。
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") return;
          try {
            const json = JSON.parse(payload);
            const delta: string | undefined = json?.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // 半截 JSON(跨 chunk 边界)会被下一轮补齐,忽略本次解析失败。
          }
        }
      }
    } finally {
      // 提前退出(消费者 break / abort)时释放上游连接。
      await reader.cancel().catch(() => {});
    }
  }

  /** query rewriting:非流式,一次拿到完整改写结果。历史为空/失败时上层可回退用原问题。 */
  async rewrite(history: LLMMessage[], question: string): Promise<string> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: REWRITE_SYSTEM_PROMPT },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: question },
        ],
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`火山 改写请求失败: HTTP ${res.status}`);
    }

    const json = await res.json();
    const rewritten: string | undefined = json?.choices?.[0]?.message?.content;
    // 拿不到就退回原问题:改写是优化项,不该因它失败而阻断检索。
    return rewritten?.trim() || question;
  }
}
