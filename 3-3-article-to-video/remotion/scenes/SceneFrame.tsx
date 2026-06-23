import { type ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const FADE_FRAMES = 8;

/**
 * 场景统一外框：背景 + 段内淡入淡出。
 *
 * 淡入淡出放在组件里（而非 ffmpeg），这样各 clip 编码参数一致，
 * step8 concat 可 `-c copy` 不重编码（R7）。
 */
export function SceneFrame({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // 短场景下 clamp 淡入淡出帧数，保证输入区间严格递增（否则 interpolate 抛错）：
  // 取 floor((dur-1)/2) 确保 fade < dur-fade；为 0 时直接不淡入淡出。
  const fade = Math.min(FADE_FRAMES, Math.floor((durationInFrames - 1) / 2));
  const opacity =
    fade <= 0
      ? 1
      : interpolate(
          frame,
          [0, fade, durationInFrames - fade, durationInFrames],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, opacity }}>
      {children}
    </AbsoluteFill>
  );
}
