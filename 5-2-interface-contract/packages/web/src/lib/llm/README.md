# `lib/llm/` — 供应商抽象层

对应 `architecture-design.md:404`(§供应商抽象层 `:414`)、CLAUDE.md 模块边界 `lib/llm`。

具体 LLM/Embedding 厂商未定(受公司内部 API 渠道影响)。本目录定义统一接口,**业务代码只依赖接口,不直接引任何厂商 SDK**;换厂商只替换实现,业务不动。

## 接口(已在 `index.ts` 定义)

```ts
interface LLMProvider {
  streamChat(messages: Message[], signal: AbortSignal): AsyncIterable<string>;
  rewrite(history: Message[], question: string): Promise<string>;
}
interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>; // 返回 1024 维
}
```

## 放什么

- `index.ts` — 接口定义(当前)。
- 后续:各厂商的 `Provider` 实现文件,按厂商命名。

## 红线

- `embed` 必须返回 **1024 维**(对齐 pgvector `vector(1024)`)。
- `streamChat` 的 `signal` 用于中断止损,透传取消上游 `fetch` 停止计费。
- 云 API 密钥只存服务端环境变量,不进 bundle/日志。
