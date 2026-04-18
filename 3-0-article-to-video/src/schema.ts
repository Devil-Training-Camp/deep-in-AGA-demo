import { z } from "zod";

export const SceneSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(["narration", "code", "broll", "title-card"]),
  narration: z.string(),
  visual_prompt: z.string().optional(),
  duration: z.number().positive(),
  code_snippet: z.string().optional(),
});

export const ScriptSchema = z.object({
  title: z.string(),
  total_duration: z.number().positive(),
  scenes: z.array(SceneSchema).min(1),
});

// ElevenLabs 词级时间戳（eleven_multilingual_v2 返回格式）
export const TimestampEntrySchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
});

export const TimestampsSchema = z.array(TimestampEntrySchema);

export type Scene = z.infer<typeof SceneSchema>;
export type Script = z.infer<typeof ScriptSchema>;
export type TimestampEntry = z.infer<typeof TimestampEntrySchema>;
