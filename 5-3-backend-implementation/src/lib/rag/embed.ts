import { getEmbeddingProvider, EMBEDDING_DIM } from "../llm/index.ts";

/**
 * 批量生成 chunk 向量 —— 输入 chunk 文本数组,输出一一对应的向量数组。
 *
 * 归属:lib/rag(检索管道)。红线(CLAUDE.md):**不直连任何厂商 SDK**,
 * 一律走 lib/llm 的 getEmbeddingProvider().embed();换厂商时本文件不动。
 * 当前实现方是火山 doubao-embedding-vision(多模态接口,dimensions:1024)。
 *
 * 维度是全系统硬约束:返回向量必须是 EMBEDDING_DIM(1024)维,对不上直接抛,
 * 不让错维向量流到写库层(doc_chunks.embedding vector(1024))。
 *
 * 注:请求里提到的 1536 维 / text-embedding-3-small 与本项目 1024 维硬约束冲突,
 * 已确认保持火山 1024 维方案,故此处按 EMBEDDING_DIM 校验、不引 OpenAI 模型。
 */

/** 分批大小:一次交给底层 embed 多少个 chunk。底层(火山多模态)会逐条串行请求,
 *  分批只用于「失败重试的粒度」与日志分段,避免一条失败让整篇重来。 */
const BATCH_SIZE = 16;
/** 单批失败重试次数(指数退避),覆盖限流(429)/瞬时网络抖动。 */
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成一批 chunk 的向量。顺序与输入严格一一对应。
 * @param chunks chunk 文本数组(非空;空数组返回空数组)
 * @returns number[][],长度 === chunks.length,每个向量 EMBEDDING_DIM 维
 * @throws 重试仍失败,或返回条数/维度不符 —— 交由调用方(process)落 failed
 */
export async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return [];

  const provider = getEmbeddingProvider();
  const result: number[][] = [];

  // 分批推进:每批独立重试,失败的批不影响已完成批的结果顺序(按批 push,保持有序)。
  for (let offset = 0; offset < chunks.length; offset += BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + BATCH_SIZE);
    const vectors = await embedBatchWithRetry(provider.embed.bind(provider), batch, offset);
    result.push(...vectors);
  }

  // 全量再校验一次条数(底层已按批校验维度,这里守总数一一对应)。
  if (result.length !== chunks.length) {
    throw new Error(`embedding 条数(${result.length})与 chunk 数(${chunks.length})不一致`);
  }
  return result;
}

/** 单批带重试地 embed;每次尝试后校验条数与维度,不达标视为失败重试。 */
async function embedBatchWithRetry(
  embed: (texts: string[]) => Promise<number[][]>,
  batch: string[],
  offset: number,
): Promise<number[][]> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const vecs = await embed(batch);
      if (vecs.length !== batch.length) {
        throw new Error(`本批返回 ${vecs.length} 条,期望 ${batch.length} 条`);
      }
      for (let i = 0; i < vecs.length; i++) {
        if (vecs[i].length !== EMBEDDING_DIM) {
          throw new Error(`第 ${offset + i} 块维度 ${vecs[i].length},期望 ${EMBEDDING_DIM}`);
        }
      }
      return vecs;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        const backoff = 500 * 2 ** (attempt - 1); // 500ms, 1s, 2s
        console.warn(
          `[embed] 批[${offset}..${offset + batch.length - 1}] 第 ${attempt} 次失败,${backoff}ms 后重试:`,
          err instanceof Error ? err.message : String(err),
        );
        await sleep(backoff);
      }
    }
  }
  throw new Error(
    `[embed] 批[${offset}..${offset + batch.length - 1}] 重试 ${MAX_RETRIES} 次仍失败: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}
