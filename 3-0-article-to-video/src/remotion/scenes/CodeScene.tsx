import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { type Scene } from "../../schema";

// 轻量语法高亮
function highlight(code: string): React.ReactNode[] {
  const keywords =
    /\b(const|let|var|function|return|async|await|import|export|from|type|interface|class|extends|if|else|for|while|new|throw|try|catch|typeof|instanceof|of|in|null|undefined|true|false)\b/g;
  const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;

  const parts: React.ReactNode[] = [];
  let last = 0;
  const matches: Array<{ index: number; length: number; type: string; text: string }> = [];

  for (const [re, type] of [
    [comments, "comment"],
    [strings, "string"],
    [keywords, "keyword"],
  ] as [RegExp, string][]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      matches.push({ index: m.index, length: m[0].length, type, text: m[0] });
    }
  }
  matches.sort((a, b) => a.index - b.index);

  const colorMap: Record<string, string> = {
    keyword: "#c792ea",
    string: "#c3e88d",
    comment: "#4a5568",
  };

  for (const match of matches) {
    if (match.index < last) continue;
    if (match.index > last) parts.push(code.slice(last, match.index));
    parts.push(
      <span key={match.index} style={{ color: colorMap[match.type] }}>
        {match.text}
      </span>
    );
    last = match.index + match.length;
  }
  if (last < code.length) parts.push(code.slice(last));
  return parts;
}

export const CodeScene: React.FC<{
  scene: Scene;
  hasAudio: boolean;
}> = ({ scene, hasAudio }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const safeEnterEnd = Math.min(18, durationInFrames);
  const safeExitStart = Math.max(durationInFrames - 10, safeEnterEnd);

  const enterProgress = interpolate(frame, [0, safeEnterEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [safeExitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = enterProgress * exitOpacity;

  const code = scene.code_snippet ?? "";
  const lines = code.split("\n");
  const hasNarration = !!scene.narration;

  // 打字机效果：代码行逐渐显示
  const visibleLines = Math.min(
    lines.length,
    Math.floor(
      interpolate(frame, [0, durationInFrames * 0.7], [0, lines.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    )
  );

  return (
    <AbsoluteFill
      style={{
        background: "#0d1117",
        display: "flex",
        flexDirection: "column",
        padding: hasNarration ? "56px 72px 32px" : "72px",
      }}
    >
      {/* 代码编辑器窗口 */}
      <div
        style={{
          flex: 1,
          borderRadius: 14,
          background: "#161b22",
          border: "1px solid #30363d",
          padding: "32px 48px",
          overflow: "hidden",
          opacity,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 红绿黄按钮 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
            <div
              key={i}
              style={{ width: 13, height: 13, borderRadius: "50%", background: c }}
            />
          ))}
        </div>

        {/* 代码内容 */}
        <pre
          style={{
            margin: 0,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontSize: 30,
            lineHeight: 1.75,
            color: "#e6edf3",
            whiteSpace: "pre",
            overflow: "hidden",
          }}
        >
          {lines.slice(0, visibleLines).map((line, i) => (
            <div key={i}>{highlight(line)}</div>
          ))}
          {/* 闪烁光标 */}
          {visibleLines < lines.length && (
            <span
              style={{
                display: "inline-block",
                width: 3,
                height: "1.2em",
                background: "#58a6ff",
                verticalAlign: "text-bottom",
                opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0,
              }}
            />
          )}
        </pre>
      </div>

      {/* 旁白文字 — 在代码下方，足够大 */}
      {hasNarration && (
        <div
          style={{
            marginTop: 32,
            opacity,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              color: "#94a3b8",
              fontSize: 40,
              margin: 0,
              lineHeight: 1.6,
              fontFamily:
                "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
            }}
          >
            {scene.narration}
          </p>
        </div>
      )}

      {/* 底部进度条 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(frame / Math.max(durationInFrames, 1)) * 100}%`,
            background: "linear-gradient(90deg, #6366f1, #a855f7)",
          }}
        />
      </div>

      {hasAudio && <Audio src={staticFile(`audio/scene-${scene.id}.mp3`)} />}
    </AbsoluteFill>
  );
};
