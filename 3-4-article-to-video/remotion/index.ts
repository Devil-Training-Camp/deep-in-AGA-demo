import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

// Remotion 渲染入口（CLAUDE.md 约定 remotion/index.ts）。
// 编程式渲染 bundle({ entryPoint: "remotion/index.ts" })，开发期可 `npx remotion studio`。
registerRoot(RemotionRoot);
