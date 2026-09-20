import type { EmbeddingProvider } from "./index.ts";
import { EMBEDDING_DIM } from "./index.ts";

/**
 * 火山方舟(Volcano Ark)Embedding 实现 —— 只实现 EmbeddingProvider 契约。
 *
 * 红线(CLAUDE.md):业务代码只依赖 lib/llm 的接口,厂商细节全部收敛在这里;
 * 换厂商只替换本文件 + 注册处,worker / rag 不动。
 *
 * 关键事实(均由对真实接口的探测确认,非文档臆测):
 *   - 配置的 EMBEDDING_MODEL 是 doubao-embedding-vision(视觉多模态版),它**不支持**
 *     纯文本 /embeddings 接口(会 400),必须走多模态 /embeddings/multimodal。
 *   - 多模态接口一次只吃一条 input,响应是单个 data.embedding(不是 data[] 数组)。
 *   - 该模型默认输出 2048 维,但支持 `dimensions` 参数降维;传 dimensions:1024 精确返回
 *     1024 维,正好卡上 doc_chunks.embedding vector(1024) 的硬约束(EMBEDDING_DIM)。
 *
 * 密钥只从 process.env 运行时读取,绝不硬编码、绝不进日志/错误响应(CLAUDE.md 安全红线)。
 */

interface MultimodalEmbeddingResponse {
  data?: { embedding?: number[] };
  error?: { message?: string };
}

/** 读服务端 env,缺失即抛(启动期暴露配置缺失,而非运行时深处 NPE)。 */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`环境变量 ${name} 未配置(火山 Embedding 依赖)`);
  }
  return v.trim();
}

export class VolcEmbeddingProvider implements EmbeddingProvider {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    // 注:不用 TS 参数属性 —— strip-types 模式不支持,会在 import 时 SyntaxError。
    this.endpoint = requireEnv("EMBEDDING_BASE_URL").replace(/\/$/, "") + "/embeddings/multimodal";
    this.apiKey = requireEnv("EMBEDDING_API_KEY");
    this.model = requireEnv("EMBEDDING_MODEL");
  }

  /**
   * 批量 embedding。多模态接口不支持批量入参,故逐条串行请求(本期入库量小、
   * worker 后台跑,串行足够;需要提速再改并发上限)。任一条失败即整体抛错,
   * 交给 worker 落 failed —— 半批向量入库会污染检索。
   */
  async embed(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (const text of texts) {
      out.push(await this.embedOne(text));
    }
    return out;
  }

  private async embedOne(text: string): Promise<number[]> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: [{ type: "text", text }],
        dimensions: EMBEDDING_DIM, // 强制降到 1024,匹配 doc_chunks 硬约束
      }),
    });

    if (!res.ok) {
      // 只带状态码,不回显 body(可能含请求内容);完整 body 留给上层按需 console。
      throw new Error(`火山 Embedding 请求失败: HTTP ${res.status}`);
    }

    const json = (await res.json()) as MultimodalEmbeddingResponse;
    const vec = json.data?.embedding;
    if (!Array.isArray(vec)) {
      throw new Error("火山 Embedding 响应缺少 data.embedding");
    }
    if (vec.length !== EMBEDDING_DIM) {
      // 维度是全系统硬约束,对不上必须显式炸,不能让错维向量写进库。
      throw new Error(`火山 Embedding 维度为 ${vec.length},期望 ${EMBEDDING_DIM}`);
    }
    return vec;
  }
}
