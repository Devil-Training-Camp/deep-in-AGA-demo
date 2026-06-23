import { type CharAlignment } from "../../schema/scene";

/** 一条字幕 cue：绝对时间（秒）+ 文本。 */
export interface Cue {
  startSec: number;
  endSec: number;
  text: string;
}

// 中文句读 + 常见标点，作为切句边界
const BREAK = /[。！？；，、…!?;,]/;
const MAX_CHARS = 18;

/**
 * 把字符级 alignment 聚合成词/句级 cue，并叠加场景在全片中的起点偏移。
 * 按标点或最长字数切句；句末标点并入当前 cue。文本取 alignment.characters
 * （即送 TTS 的实际文本，R9，与时间戳一致）。
 */
export function alignmentToCues(alignment: CharAlignment, offsetSec: number): Cue[] {
  const { characters, characterStartTimesSeconds, characterEndTimesSeconds } = alignment;
  const cues: Cue[] = [];

  let start: number | null = null;
  let text = "";
  let lastEnd = 0;

  const flush = () => {
    if (text.trim()) {
      cues.push({
        startSec: (start ?? 0) + offsetSec,
        endSec: lastEnd + offsetSec,
        text: text.trim(),
      });
    }
    start = null;
    text = "";
  };

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i] ?? "";
    if (ch === "\n") {
      flush();
      continue;
    }
    if (start === null) start = characterStartTimesSeconds[i] ?? 0;
    text += ch;
    lastEnd = characterEndTimesSeconds[i] ?? lastEnd;
    if (BREAK.test(ch) || text.length >= MAX_CHARS) flush();
  }
  flush();

  return cues;
}

/** 把 cue 列表渲染成 SRT 文本。 */
export function cuesToSrt(cues: Cue[]): string {
  return cues
    .map((cue, i) => {
      return `${i + 1}\n${srtTime(cue.startSec)} --> ${srtTime(cue.endSec)}\n${cue.text}\n`;
    })
    .join("\n");
}

function srtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}
