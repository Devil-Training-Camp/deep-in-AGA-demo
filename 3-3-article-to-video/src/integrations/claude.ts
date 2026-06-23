import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ScriptSchema, type Script } from "../schema/scene";
import { type Config } from "../lib/config";
import { RetryableError } from "../lib/errors";
import { logger } from "../lib/logger";
import { type ParsedDoc, type ParsedBlock } from "../pipeline/parse/mdast-to-blocks";

/**
 * Claude 集成（步骤 2 改写 + 步骤 3 分镜）。
 *
 * SDK 路线（已查证 @anthropic-ai/sdk@0.65.0 无 messages.parse / zodOutputFormat）：
 * 用底层 `messages.create({ output_config: { format: { type:"json_schema", schema } } })`
 * 强制 JSON 输出，再手动 `JSON.parse` + `ScriptSchema.safeParse` 校验，不合则 RetryableError 重试。
 * 这满足"schema 校验 + 重试"的本意——真正的校验器是 zod ScriptSchema，而非 SDK helper。
 *
 * 注：Opus 4.8 用 `thinking:{type:"adaptive"}`，不支持 temperature/budget_tokens。
 * id/scroll/estimatedDuration 由 pipeline 派生，prompt 要求 LLM 不产出；即便产出，enrich 也会覆盖重算。
 */

export interface GenerateOptions {
  dryRun: boolean;
  apiKey?: string;
  /** Bearer Token 鉴权（与 apiKey 二选一，常见于自建代理） */
  authToken?: string;
  /** 自定义 Anthropic API 地址（转发到自有中转服务器） */
  baseURL?: string;
}

const REWRITE_SYSTEM_PROMPT = `你是把技术文章改写成短视频「口播脚本 + 分镜」的助手。输入是一篇技术文章的结构化内容，输出一段 JSON，形如 { "scenes": [ ... ] }，scenes 是按叙事顺序排列的场景数组。

场景有四类，用 type 区分，按内容选择最合适的一类：
- "title"：标题卡 / 章节封面。narration 可为空串（静音，纯动画）。带 title、可选 subtitle。
- "narration"：纯旁白，画面配要点。带 narration，可选 bullets（要点数组）。
- "code"：展示代码。带 code（原代码）、language（语言标识，如 tsx）。可选 highlightLines（要高亮的行号，0-indexed，首行=0）。
- "image"：展示文章自带图。带 imagePath（沿用文章里图片的原始路径）。

写作要求：
- narration 是中文口语，能"听懂"，不是书面语照搬。适当改编、压缩，突出重点。
- 全片口播总字数控制在约 1200~1500 字以内（对应 ≤5 分钟）。宁可精炼，不要逐段复述。
- 中英混排：保留必要的英文术语（如 useMemo、React Compiler），让朗读自然。
- 代码场景的 narration 用来讲解这段代码，配合画面；短代码可一句带过。
- 不要输出 id、scroll、estimatedDuration 这三个字段（由系统自动派生）。
- 只输出 JSON，不要 Markdown、不要解释性文字。`;

/** 把结构化文章喂给 LLM 的用户消息。 */
function buildUserPrompt(parsed: ParsedDoc): string {
  return [
    `文章标题：${parsed.title}`,
    "下面是文章的结构化内容（按原文顺序排列的 block），请据此改写成视频的口播脚本 + 分镜：",
    JSON.stringify(parsed.blocks, null, 2),
  ].join("\n\n");
}

/**
 * 步骤 2/3 的核心：把结构化文章改写成脚本 + 分镜（LLM 子集，不含派生字段）。
 * 返回的 Script 交给 step3 的 enrichScript 补齐 id/scroll/estimatedDuration。
 */
export async function generateScript(
  parsed: ParsedDoc,
  config: Config,
  opts: GenerateOptions,
): Promise<Script> {
  if (opts.dryRun) {
    logger.info("dry-run：用确定性 mock 脚本（不调用 Claude）");
    return mockScriptFromParsed(parsed);
  }
  if (!opts.apiKey && !opts.authToken) {
    throw new Error(
      "缺少 Anthropic 凭证：在 .env 配置 ANTHROPIC_API_KEY 或 ANTHROPIC_AUTH_TOKEN（或用 --dry-run）",
    );
  }

  // 优先用 Bearer Token（自建代理常用）；否则用 x-api-key
  const client = new Anthropic({
    baseURL: opts.baseURL,
    ...(opts.authToken
      ? { authToken: opts.authToken }
      : { apiKey: opts.apiKey }),
  });
  const jsonSchema = zodToJsonSchema(ScriptSchema, { $refStrategy: "none" });

  return withRetry(async () => {
    const body = {
      model: config.llmModel,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: REWRITE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(parsed) }],
      output_config: { format: { type: "json_schema", schema: jsonSchema } },
    };
    // 0.65.0 的类型未覆盖 output_config/adaptive thinking，运行时支持，双重断言透传
    const res = await client.messages.create(
      body as unknown as Anthropic.MessageCreateParamsNonStreaming,
    );

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    let obj: unknown;
    try {
      obj = JSON.parse(extractJson(text));
    } catch {
      throw new RetryableError(
        `LLM 输出非合法 JSON（前 200 字）：${text.slice(0, 200)}`,
      );
    }
    const parsedScript = ScriptSchema.safeParse(obj);
    if (!parsedScript.success) {
      throw new RetryableError(`LLM 输出不合 schema：${parsedScript.error.message}`);
    }
    return parsedScript.data;
  }, 3);
}

/**
 * 从模型回复里提取 JSON。
 * 容错那些不严格遵守 `output_config`（如自建代理后端不支持结构化输出）的情况：
 * 剥掉 ```json``` markdown 围栏，再取首个 `{` 到末个 `}` 之间的内容。
 */
function extractJson(text: string): string {
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = fence ? fence[1]! : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start !== -1 && end > start ? body.slice(start, end + 1) : body.trim();
}

/** RetryableError 重试若干次；非可重试错误直接抛出。 */
async function withRetry<T>(fn: () => Promise<T>, times: number): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!(e instanceof RetryableError)) throw e;
      logger.warn(`LLM 重试 ${attempt}/${times}：${e.message}`);
    }
  }
  throw lastErr;
}

/**
 * dry-run mock：把结构化文章确定性地映射成脚本，用于不计费跑通全链。
 * 规则力求产出一条结构合理的视频：H1→标题卡，H2→分节标题卡，段落→旁白，
 * 代码块→代码场景，图片→配图场景。narration 直接取原文（mock 不做改写）。
 */
function mockScriptFromParsed(parsed: ParsedDoc): Script {
  const scenes: Script["scenes"] = [];
  for (const block of parsed.blocks) {
    const scene = mockSceneFromBlock(block);
    if (scene) scenes.push(scene);
  }
  // 兜底：空文章至少给一张标题卡
  if (scenes.length === 0) {
    scenes.push({ type: "title", narration: "", title: parsed.title || "未命名" });
  }
  return { scenes };
}

function mockSceneFromBlock(block: ParsedBlock): Script["scenes"][number] | null {
  switch (block.type) {
    case "heading":
      return {
        type: "title",
        narration: "",
        title: block.text,
        ...(block.depth === 1 ? {} : { subtitle: "本节要点" }),
      };
    case "paragraph":
      return { type: "narration", narration: block.text };
    case "code":
      return {
        type: "code",
        narration: "",
        code: block.value,
        language: block.lang || "text",
      };
    case "image":
      return {
        type: "image",
        narration: "",
        imagePath: block.url,
        ...(block.alt ? { caption: block.alt } : {}),
      };
    case "list":
      return { type: "narration", narration: block.items.join("；"), bullets: block.items };
    case "blockquote":
      return { type: "narration", narration: block.text };
    case "table":
      return {
        type: "narration",
        narration: block.header.join("、"),
        bullets: block.rows.map((r) => r.join(" | ")),
      };
    default:
      return null;
  }
}
