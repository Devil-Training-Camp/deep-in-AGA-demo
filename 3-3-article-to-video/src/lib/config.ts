import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import dotenv from "dotenv";

// 加载 .env 与 .env.local（后者优先）。override:true —— 让本地配置优先于已存在的
// 环境变量（如 Claude Code 会话自带的 ANTHROPIC_BASE_URL/ANTHROPIC_AUTH_TOKEN），
// 否则同名配置会被静默盖住。
dotenv.config({ path: ".env", override: true });
dotenv.config({ path: ".env.local", override: true });

/**
 * 运行配置（requirements.md §统一视觉主题与配置项）。
 * 分辨率/帧率为硬约束，写死；voice、语速、留白、输出目录等为可配置项，
 * 便于不同文章或风格复用。配置文件可选，缺省走 DEFAULTS。
 */
export const ConfigSchema = z.object({
  /** 产物根目录，每个 job 一个子目录 */
  outputDir: z.string().default("output"),

  // —— 视频硬约束（不建议改，列出以示来源）——
  width: z.literal(1920).default(1920),
  height: z.literal(1080).default(1080),
  fps: z.literal(30).default(30),
  maxDurationSec: z.number().default(300),

  // —— LLM（步骤 2/3）——
  llmModel: z
    .enum(["claude-opus-4-8", "claude-sonnet-4-6"])
    .default("claude-opus-4-8"),

  // —— TTS（步骤 4）——
  ttsVoiceId: z.string().default(""),
  ttsModel: z
    .enum(["eleven_multilingual_v2", "eleven_v3"])
    .default("eleven_multilingual_v2"),

  /** 场景留白秒数，参与 `场景时长 = max(...) + 留白`（默认 0.3~0.5） */
  scenePaddingSec: z.number().default(0.4),

  /** code 场景滚动阈值：行数超过则 pipeline 置 scroll=true */
  codeScrollMaxLines: z.number().default(18),

  /** 每个场景的最短动画时长（秒），托底静音场景与短音频场景 */
  minSceneSec: z.number().default(2.5),

  /** 滚动代码每行的滚动耗时（秒），决定滚动场景的最短动画时长 */
  codeScrollSecPerLine: z.number().default(0.45),

  /** 口播语速（字/秒），步骤 3 据此由 narration 字数推导 estimatedDuration */
  estimateCharsPerSec: z.number().default(4.5),

  /** 术语纠音别名表：送 TTS 前做文本替换（中文不支持音素级词典） */
  pronunciationAliases: z.record(z.string()).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

export interface Secrets {
  anthropicApiKey: string | undefined;
  /** Bearer Token 鉴权（x-api-key 之外的另一种，常见于自建代理/中转） */
  anthropicAuthToken: string | undefined;
  /** 自定义 Anthropic API 地址（转发到自有中转服务器）；留空用官方默认 */
  anthropicBaseURL: string | undefined;
  elevenLabsApiKey: string | undefined;
}

export function loadSecrets(): Secrets {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
    anthropicAuthToken: process.env.ANTHROPIC_AUTH_TOKEN || undefined,
    anthropicBaseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || undefined,
  };
}

/**
 * 加载配置：可选传入 config.json 路径，与默认值合并后用 zod 校验。
 * 文件不存在时直接返回全默认配置。
 */
export function loadConfig(configPath?: string): Config {
  let raw: Record<string, unknown> = {};
  if (configPath) {
    const abs = path.resolve(configPath);
    if (fs.existsSync(abs)) {
      raw = JSON.parse(fs.readFileSync(abs, "utf8"));
    }
  }
  const config = ConfigSchema.parse(raw);
  // 便利：voice id 也可走环境变量 ELEVENLABS_VOICE_ID（与 key 放在 .env 一处），
  // 配置文件里的 ttsVoiceId 优先。
  if (!config.ttsVoiceId && process.env.ELEVENLABS_VOICE_ID) {
    config.ttsVoiceId = process.env.ELEVENLABS_VOICE_ID;
  }
  return config;
}
