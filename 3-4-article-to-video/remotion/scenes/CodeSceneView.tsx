import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ThemedToken, BundledLanguage, SpecialLanguage } from "shiki";
import { type CodeSceneData } from "../../src/schema/scene";
import { getHighlighter, safeLang, CODE_THEME } from "../lib/highlighter";
import { theme } from "../theme";

/**
 * 代码展示：Shiki 逐行 token 着色 + 行高亮（0-indexed）+ 长码滚动。
 *
 * - highlighter 模块级单例 + delayRender/continueRender，避免逐帧异步空帧；
 * - 用 codeToTokens 拿到逐行 token，便于按 highlightLines 高亮整行、按帧滚动；
 * - 滚动用 useCurrentFrame + interpolate 驱动 translateY（不用 CSS 滚动，保证逐帧确定）。
 */
export function CodeSceneView({ scene }: { scene: CodeSceneData }) {
  const frame = useCurrentFrame();
  const { durationInFrames, height } = useVideoConfig();
  const [lines, setLines] = useState<ThemedToken[][] | null>(null);
  const [handle] = useState(() => delayRender("shiki-highlight"));

  useEffect(() => {
    let alive = true;
    getHighlighter()
      .then((h) => {
        const lang = safeLang(h, scene.language) as BundledLanguage | SpecialLanguage;
        const { tokens } = h.codeToTokens(scene.code, { lang, theme: CODE_THEME });
        if (alive) {
          setLines(tokens);
          continueRender(handle);
        }
      })
      .catch(() => {
        if (alive) continueRender(handle); // 高亮失败也要放行该帧
      });
    return () => {
      alive = false;
    };
  }, [handle, scene.code, scene.language]);

  if (!lines) return null; // delayRender 持帧，等高亮就绪

  const lineHeightPx = theme.fontSize.code * 1.5;
  const viewport = height - theme.paddingPx * 2;
  const scrollDistance = Math.max(0, lines.length * lineHeightPx - viewport);
  const translateY = scene.scroll
    ? interpolate(
        frame,
        [durationInFrames * 0.1, durationInFrames * 0.9],
        [0, -scrollDistance],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  return (
    <AbsoluteFill
      style={{
        padding: theme.paddingPx,
        overflow: "hidden",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: theme.colors.fg,
      }}
    >
      <pre
        style={{
          margin: 0,
          fontSize: theme.fontSize.code,
          lineHeight: `${lineHeightPx}px`,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {lines.map((tokens, i) => (
          <div
            key={i}
            style={{
              backgroundColor: scene.highlightLines?.includes(i)
                ? "rgba(88,166,255,0.15)"
                : "transparent",
            }}
          >
            {tokens.length
              ? tokens.map((t, j) => (
                  <span key={j} style={{ color: t.color }}>
                    {t.content}
                  </span>
                ))
              : " "}
          </div>
        ))}
      </pre>
    </AbsoluteFill>
  );
}
