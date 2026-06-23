import { createHighlighter, type Highlighter } from "shiki";

/**
 * Shiki highlighter 模块级单例。
 *
 * 逐帧渲染下高亮必须确定性、且不能每帧重建（会触发异步空帧）：
 * 在模块级缓存一个 highlighter Promise，所有帧、所有 code 场景共用。
 * 组件内配合 Remotion 的 delayRender/continueRender 等它就绪。
 */

export const CODE_THEME = "github-dark";

// 预加载的语言集，与 src/pipeline/script-io.ts 的 normalizeLanguage 输出对齐
// （plaintext 是 Shiki 内置 no-op 语言，无需预载）。
const LANGS = [
  "javascript", "typescript", "jsx", "tsx", "bash", "json", "yaml",
  "markdown", "python", "css", "html", "sql", "go", "rust", "java", "c", "cpp",
];

let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({ themes: [CODE_THEME], langs: LANGS });
  }
  return highlighterPromise;
}

/** 取一个 highlighter 已加载的安全语言；未加载的降级为 plaintext。 */
export function safeLang(highlighter: Highlighter, lang: string): string {
  return highlighter.getLoadedLanguages().includes(lang) ? lang : "plaintext";
}
