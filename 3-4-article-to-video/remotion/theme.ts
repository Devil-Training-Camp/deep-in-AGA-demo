/**
 * 统一视觉主题（requirements.md §统一视觉主题）。配色、字体、版式集中在此，
 * 保证各场景观感一致、像一个完整作品。占位值，实现阶段细化。
 */
export const theme = {
  colors: {
    bg: "#0d1117",
    fg: "#e6edf3",
    accent: "#58a6ff",
    muted: "#8b949e",
  },
  fontFamily:
    '-apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  fontSize: {
    title: 88,
    subtitle: 44,
    body: 40,
    code: 32,
    caption: 28,
  },
  paddingPx: 96,
} as const;

/** 视频硬约束，与 src/lib/config.ts 一致：横屏 16:9 / 1080p / 30fps。 */
export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/** 场景留白默认值（秒），参与 `max(...) + 留白`。可由 inputProps 覆盖。 */
export const DEFAULT_PADDING_SEC = 0.4;
