import { z } from "zod";

/**
 * Scene：分镜的核心数据结构，按 `type` 区分的可辨识联合（technical-design.md §关键数据结构）。
 *
 * 它贯穿「脚本阶段（只有口播 + 可视字段）」和「TTS 后阶段（回填 audio）」，
 * 靠可选字段渐进填充。`ScriptSchema` 同时是：
 *   - 步骤 2/3 的 LLM 结构化输出 schema（messages.parse + zodOutputFormat）；
 *   - 人工检查点编辑的 `02-script.json`。
 * 两端用同一份 schema 校验，保证一致。
 *
 * 注：`id`/`scroll`/`estimatedDuration` 改由 pipeline 派生，LLM 不产出，
 * 故标为可选——LLM 输出是完整 schema 的子集，步骤 3 富化后补齐。
 */

const SceneBase = z.object({
  /**
   * 稳定 ID，增量重跑比对哈希的 key。**pipeline 派生**：按可视字段哈希生成
   * （LLM 不产出），故在 schema 里可选；经步骤 3 富化后必有值
   * （EnrichedScene 把它收窄为必填）。
   */
  id: z.string().min(1).optional(),
  /** 口播文本 → 喂给 TTS。必填，空串表示静音场景（如静音标题卡） */
  narration: z.string(),
  /**
   * 预估秒数，仅发车前预算检查用，与实际渲染时长无关。
   * **pipeline 派生**：按 narration 字数推导（LLM 不产出），故可选。
   */
  estimatedDuration: z.number().optional(),
});

/** 标题卡：章节标题 / 封面。可能没有口播（静音），此时时长纯由动画决定 */
export const TitleScene = SceneBase.extend({
  type: z.literal("title"),
  title: z.string().min(1),
  subtitle: z.string().optional(),
});

/** 纯旁白：旁白为主，屏幕上配要点文字（bullets） */
export const NarrationScene = SceneBase.extend({
  type: z.literal("narration"),
  bullets: z.array(z.string()).optional(),
});

/** 代码展示：短码静态、长码滚动；滚动动画构成该场景的「最短动画时长」托底 */
export const CodeScene = SceneBase.extend({
  type: z.literal("code"),
  code: z.string().min(1),
  /** 语言标识；步骤 3 归一化为 Shiki 合法值，未知降级 plaintext */
  language: z.string().min(1),
  /** 高亮行号，**0-indexed**（首行 = 0） */
  highlightLines: z.array(z.number()).optional(),
  /** 长码滚动。**pipeline 派生**：按行数阈值决定（LLM 不产出），故可选 */
  scroll: z.boolean().optional(),
});

/** 配图：MVP 仅支持文章自带图（Markdown 的 `![]()`）的本地路径 */
export const ImageScene = SceneBase.extend({
  type: z.literal("image"),
  /** 文章自带图的原始路径（保留原样，渲染期接入可服务目录） */
  imagePath: z.string().min(1),
  caption: z.string().optional(),
});

export const SceneSchema = z.discriminatedUnion("type", [
  TitleScene,
  NarrationScene,
  CodeScene,
  ImageScene,
]);

export const ScriptSchema = z.object({
  scenes: z.array(SceneSchema),
});

export type Scene = z.infer<typeof SceneSchema>;
export type SceneType = Scene["type"];
export type Script = z.infer<typeof ScriptSchema>;

// 各变体的数据类型（供 Remotion 场景组件按 type 取用）
export type TitleSceneData = Extract<Scene, { type: "title" }>;
export type NarrationSceneData = Extract<Scene, { type: "narration" }>;
export type CodeSceneData = Extract<Scene, { type: "code" }>;
export type ImageSceneData = Extract<Scene, { type: "image" }>;

/**
 * 阶段产物的渐进增强：TTS 后每个场景回填 audio。
 * audio 不进 LLM schema（避免 AI 编造），由 TTS 阶段写入。
 */

/** ElevenLabs `with-timestamps` 返回的字符级对齐，做字幕用 */
export interface CharAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

export interface SceneAudio {
  /** audio/scene-XXX.mp3；dry-run 下为空串（不挂音轨，仅用时长跑通时间轴） */
  path: string;
  /** 渲染时长的真相，取 ElevenLabs alignment 末值（≈音频总时长，规避 ffprobe） */
  durationSec: number;
  /** ElevenLabs 字符时间戳，做字幕用 */
  alignment: CharAlignment;
}

/**
 * 喂给 Remotion 渲染的「富化场景」：在脚本场景上挂音频与动画下限。
 * 把 `id` 收窄为必填——经步骤 3 富化后 id 一定存在，下游无需再判空。
 */
export type EnrichedScene = Scene & {
  id: string;
  audio?: SceneAudio;
  /** 动画下限（如代码滚动），参与 max() 托底 */
  minAnimDurationSec?: number;
};
