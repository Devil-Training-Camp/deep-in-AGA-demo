import fs from "node:fs";
import {
  ScriptSchema,
  type Scene,
  type Script,
  type EnrichedScene,
} from "../schema/scene";
import { hashObject } from "../lib/hash";
import { type JobState } from "../schema/state";
import { type Config } from "../lib/config";
import { type JobPaths } from "../lib/paths";

/**
 * 02-script.json 的读写、pipeline 富化与逐场景哈希。
 *
 * schema 是单一 ScriptSchema，但 `id`/`scroll`/`estimatedDuration` 三个字段
 * 由 pipeline 派生（LLM 不产出，标为可选）。`enrichScript` 负责补齐它们，
 * 让落盘的 02-script.json 与渲染输入都拿到完整场景。
 */

export function writeScript(scriptPath: string, script: Script): void {
  ScriptSchema.parse(script); // 写盘前校验，人工编辑回来重跑时同样走这条
  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2), "utf8");
}

export function loadScript(scriptPath: string): Script {
  const raw = JSON.parse(fs.readFileSync(scriptPath, "utf8"));
  return ScriptSchema.parse(raw);
}

/**
 * 加载已富化脚本供步骤 4~8 使用：断言每个场景都有 id（步骤 3 富化应已补齐），
 * 返回 id 必填的 EnrichedScene[]，下游无需再判空。
 */
export function loadScriptEnriched(scriptPath: string): EnrichedScene[] {
  return loadScript(scriptPath).scenes.map((scene) => {
    if (!scene.id) {
      throw new Error(`场景缺少 id（步骤 3 富化应已补齐）：type=${scene.type}`);
    }
    return scene as EnrichedScene;
  });
}

/** 口播文本哈希：变 → 重跑该场景 TTS（并因音频时长变化牵动重渲）。 */
export function narrationHash(scene: Scene): string {
  return hashObject({ narration: scene.narration });
}

/**
 * 派生稳定场景 id（决策：可视字段哈希 + 场景位置索引）。
 * 排除 id / narration / estimatedDuration 后取可视字段哈希，再并入 index 消歧——
 * 纯旁白场景可视字段相同，靠 index 区分避免碰撞。
 *
 * 取舍：编辑 narration → 可视字段与 index 都不变 → id 稳定，靠 narrationHash 触发该段重跑；
 * 中间插入/删除/重排 → 顺移后续 index → 那些段 id 变化被判重渲（纯文本编辑不受影响）。
 */
export function deriveSceneId(scene: Scene, index: number): string {
  const { id: _i, narration: _n, estimatedDuration: _d, ...visual } = scene;
  return `scene-${hashObject({ index, visual }).slice(0, 8)}`;
}

/** 按字数推导预估秒数（发车前预算检查用，非渲染真相）。 */
export function estimateDurationSec(narration: string, charsPerSec: number): number {
  if (!narration.trim()) return 2; // 静音场景留一个动画时长占位
  return Math.round((narration.length / charsPerSec) * 10) / 10;
}

/** 长码滚动判定：行数超过阈值即滚动（决策：pipeline 按行数阈值派生）。 */
export function shouldScroll(code: string, maxLines: number): boolean {
  return code.split("\n").length > maxLines;
}

// Shiki 语言归一化（决策：受校验 + fallback）。这里是代表性子集，
// 实现阶段换成 Shiki 实际 bundled languages 全集；未知一律降级 plaintext。
const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  md: "markdown",
  py: "python",
};
const KNOWN_LANGUAGES = new Set([
  "javascript", "typescript", "jsx", "tsx", "bash", "json", "yaml",
  "markdown", "python", "css", "html", "sql", "go", "rust", "java",
  "c", "cpp", "plaintext",
]);

export function normalizeLanguage(lang: string): string {
  const key = lang.trim().toLowerCase();
  const mapped = LANGUAGE_ALIASES[key] ?? key;
  return KNOWN_LANGUAGES.has(mapped) ? mapped : "plaintext";
}

/**
 * 富化单个场景：补齐 pipeline 派生字段。
 * id 每次都从最终可视字段重算（不沿用文件里的旧值）——这样可视字段一改，
 * id 随之变化，配合「删 visualHash、按 id 比对」才能正确触发重渲。
 */
function enrichScene(scene: Scene, config: Config, index: number): Scene {
  let visual = scene;
  if (scene.type === "code") {
    visual = {
      ...scene,
      language: normalizeLanguage(scene.language),
      scroll: shouldScroll(scene.code, config.codeScrollMaxLines),
    };
  }
  const id = deriveSceneId(visual, index);
  const estimatedDuration = estimateDurationSec(
    scene.narration,
    config.estimateCharsPerSec,
  );
  return { ...visual, id, estimatedDuration };
}

/** 富化整份脚本：把 LLM 输出的子集补成完整 ScriptSchema。 */
export function enrichScript(script: Script, config: Config): Script {
  return { scenes: script.scenes.map((s, i) => enrichScene(s, config, i)) };
}

/**
 * 按当前脚本刷新逐场景进度，键为派生 id。
 * narrationHash 变化的场景，audioDone / clipDone 置 false 触发增量重跑；
 * 可视字段变化已体现为新 id（新记录，天然 false），旧记录留作孤儿待 GC。
 */
export function syncSceneProgress(state: JobState, script: Script): void {
  script.scenes.forEach((scene, i) => {
    const id = scene.id ?? deriveSceneId(scene, i);
    const nHash = narrationHash(scene);
    const prev = state.scenes[id];
    const unchanged = prev?.narrationHash === nHash;
    state.scenes[id] = {
      narrationHash: nHash,
      audioDone: unchanged && prev?.audioDone === true,
      clipDone: unchanged && prev?.clipDone === true,
    };
  });
}

/**
 * 孤儿清理（R3）：删掉 state 里不在当前脚本 id 集合的旧记录，及其盘上产物
 * （旧 id 的 mp3 / sidecar / clip）。改可视字段换新 id 后，旧产物在此回收。
 * 须在 step3 富化、拿到最终 id 集合之后调用。返回清理的场景数。
 */
export function gcOrphans(state: JobState, script: Script, paths: JobPaths): number {
  const live = new Set(script.scenes.map((s, i) => s.id ?? deriveSceneId(s, i)));
  let removed = 0;
  for (const id of Object.keys(state.scenes)) {
    if (live.has(id)) continue;
    delete state.scenes[id];
    for (const f of [paths.audioFile(id), paths.audioSidecar(id), paths.clipFile(id)]) {
      if (fs.existsSync(f)) fs.rmSync(f);
    }
    removed++;
  }
  return removed;
}
