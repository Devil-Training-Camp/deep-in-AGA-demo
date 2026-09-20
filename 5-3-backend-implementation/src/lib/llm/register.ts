import { registerProviders } from "./index.ts";
import { VolcEmbeddingProvider } from "./volc-embedding.ts";
import { VolcLLMProvider } from "./volc-llm.ts";

/**
 * 厂商装配 —— 把当前拍板的实现注入 lib/llm registry。应用/脚本启动时调用一次。
 *
 * 当前分工(2026-09-15):LLM 与 Embedding 均走火山方舟(Volcano Ark)。
 *   - LLM(生成 + 改写)→ 火山 doubao(/chat/completions,OpenAI 兼容)
 *   - Embedding(向量)→ 火山 doubao-embedding-vision(多模态接口,dimensions:1024)
 *
 * 换厂商只改这里 + 对应实现文件;业务代码始终用 getLLMProvider/getEmbeddingProvider,不动。
 */
export function registerConfiguredProviders(): void {
  registerProviders({
    llm: new VolcLLMProvider(),
    embedding: new VolcEmbeddingProvider(),
  });
}
