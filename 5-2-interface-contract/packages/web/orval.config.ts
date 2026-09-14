import { defineConfig } from "orval";

/**
 * 由 `../shared/src/api/schema.yaml`(OpenAPI 3.1,单一事实源)生成前端请求函数到
 * `src/lib/api/generated/`。运行:`pnpm --filter @kb/web gen:api`。
 *
 * 关键约定:
 * - httpClient: axios —— 与 5.1 节的 API 基础层(createApiClient)对齐,
 *   并通过 mutator 让生成函数复用那一份实例(鉴权/重试/错误归一化不重复实现)。
 * - 排除 `POST /api/chat`(tags: [chat]):SSE 走 fetch + AbortController 的独立流式客户端,
 *   axios 套不上流内 event:error 契约(client.ts / architecture-design.md:299、301)。
 *   chat 用到的 SseEvent 等 schema 也随之不生成——它们已由 @kb/shared 的 streaming.ts 提供。
 * - baseURL 不写死在配置里:由 mutator 从环境变量读(见 mutator.ts),同源部署可回落 `/api`。
 */
export default defineConfig({
  kb: {
    input: {
      target: "../shared/src/api/schema.yaml",
      filters: {
        // 排除 chat 这一组(当前仅 POST /api/chat 一个操作),其余接口照常生成。
        mode: "exclude",
        tags: ["chat"],
      },
    },
    output: {
      mode: "tags-split",
      target: "src/lib/api/generated",
      httpClient: "axios",
      // 生成的响应/请求类型直接引用 @kb/shared 已有定义,避免与 schema 漂移出第二份。
      // 这里只生成「请求函数」;类型的单一事实源仍是 shared 的 api.ts。
      override: {
        mutator: {
          path: "src/lib/api/mutator.ts",
          name: "customInstance",
        },
        // 解耦「函数名」与「生成类型标识名」:函数名保持 operationId(uploadDocument),
        // 但 orval 为每个操作自动产出的 *Result/*Body/*Params 类型改用带 `Op` 的基名。
        // 否则响应 schema 命名恰为 `<OperationId>Result`(如 UploadDocumentResult、
        // DeleteKnowledgeBaseResult)时,会与自动别名同名冲突(TS2440)。
        operationName: (operation, _route, _verb) => {
          const id = operation.operationId ?? "";
          return [id, `${id.charAt(0).toUpperCase()}${id.slice(1)}Op`];
        },
      },
    },
  },
});
