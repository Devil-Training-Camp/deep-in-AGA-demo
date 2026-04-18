# 文章转视频 Pipeline —— 技术设计文档

## 整体架构

整个系统分为两个独立运行单元，职责不同，分开部署。

```
┌─────────────────────────────────────────────────────────┐
│  单元一：/gen-script Skill（交互式，Claude Code 内运行）  │
│                                                          │
│  输入：input/{article}.md                                │
│  过程：Claude API 生成分镜脚本 → Zod 校验 → 写文件       │
│  输出：output/{slug}/script.json                         │
│                                    ↓ 人工审阅/修改        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  单元二：pipeline.ts（自动化，Node.js 脚本）              │
│                                                          │
│  输入：output/{slug}/script.json（人工确认后）            │
│  Step 2：ElevenLabs TTS → 回写 duration                  │
│  Step 3：B-roll 视频生成（完整版，MVP 跳过）              │
│  Step 4：Remotion 视频合成                               │
│  输出：output/{slug}/final.mp4                           │
└─────────────────────────────────────────────────────────┘
```

两个单元通过 `script.json` 文件解耦——Skill 负责生产，pipeline 负责消费，中间有人工介入的空间。

---

## 核心数据结构

`script.json` 是整个系统的枢纽，贯穿所有步骤。其结构在 `src/schema.ts` 中用 Zod 定义，同时作为类型系统和运行时校验的唯一来源。

```typescript
// src/schema.ts

const SceneSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(["narration", "code", "broll", "title-card"]),
  narration: z.string(),            // title-card 可为 ""
  visual_prompt: z.string().optional(), // 仅 broll 必填
  duration: z.number().positive(),  // 秒；Step 2 后被实际音频时长覆盖
  code_snippet: z.string().optional(), // 仅 code 必填
});

const ScriptSchema = z.object({
  title: z.string(),
  total_duration: z.number(),
  scenes: z.array(SceneSchema),
});

const TimestampEntrySchema = z.object({
  // 字段名待 ElevenLabs API 验证后填入
  word: z.string(),
  start: z.number(), // 秒
  end: z.number(),
});

export type Script = z.infer<typeof ScriptSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type TimestampEntry = z.infer<typeof TimestampEntrySchema>;
```

`script.json` 在生命周期内经历两次写入：
1. **Step 1（Skill）**：初始生成，`duration` 为 Claude 估算值
2. **Step 2（pipeline）**：TTS 完成后回写，`duration` 替换为实际音频时长

Step 4（Remotion）读取的是 Step 2 回写后的版本，`durationInFrames` 全部从 `duration * fps` 计算得来。

---

## 单元一：/gen-script Skill

### 触发方式

在 Claude Code 中执行：
```
/gen-script input/2-2-mcp-intro.md
```

Skill 定义位于 `.claude/skills/gen-script/SKILL.md`，Claude Code 读取后执行 `src/steps/1-script.ts`。

### 执行流程

```
读取 article.md
    ↓
预处理（见下文）
    ↓
调用 Claude API（claude-opus-4-6）
    ↓
Zod strict 校验（ScriptSchema）
校验失败 → 抛错，打印具体字段，终止
    ↓
写入 output/{slug}/script.json
```

### 输入预处理

预处理在送入 Claude 前完成，目的是规范化输入、降低 Claude 的幻觉概率：

| 元素 | 处理方式 | 原因 |
|------|---------|------|
| Markdown 图片 | 提取 alt text，丢弃 URL | URL 对旁白无意义 |
| 代码块 | 保留原始代码，标记为强制 `type=code` | 代码内容需要完整传入 |
| 表格 | 转为文字描述 | Remotion 渲染表格成本高 |
| 外链/脚注 | 忽略 | 不进入旁白 |
| 超长文章（>80k tokens） | 按 H2 分段生成，最后合并并对 `id` 全局重排 | 避免超出 context window |

### slug 推导规则

```typescript
// 示例：input/2-2-mcp-intro.md → slug = "2-2-mcp-intro"
const slug = path.basename(articlePath, path.extname(articlePath));
const outputDir = path.join("output", slug);
```

---

## 单元二：pipeline.ts

### 调用方式

```bash
pnpm pipeline output/2-2-mcp-intro/script.json
```

slug 从路径推导：
```typescript
const scriptPath = process.argv[2];
const outputDir = path.dirname(scriptPath); // output/2-2-mcp-intro
```

### 执行流程与断点续跑

pipeline 串行执行 Step 2 → 3 → 4，每步完成后写入 `.done` 标记文件，下次执行时跳过已完成的步骤。

```
读取 script.json → Zod 校验（再次校验，防止人工修改引入错误）
    ↓
检查 .step2.done → 不存在则执行 Step 2，完成后写 .step2.done
    ↓
检查 .step3.done → 不存在则执行 Step 3（MVP 跳过），完成后写 .step3.done
    ↓
检查 .step4.done → 不存在则执行 Step 4，完成后写 .step4.done
```

`--force` 参数清除所有 `.done` 文件，强制全量重跑：
```bash
pnpm pipeline output/2-2-mcp-intro/script.json --force
```

---

## Step 2：语音合成

### 时间轴关键设计

TTS 输出时长不可预测，同样文字因语速差异可能相差 1~2 秒。Step 2 完成后**必须用实际音频时长覆盖 `script.json` 中的 `duration`**，否则 Remotion 的时间轴会出现音频截断或画面空转。

```typescript
// Step 2 完成后回写流程
import { parseFile } from "music-metadata";

for (const scene of script.scenes) {
  if (!scene.narration) continue; // title-card 等跳过

  const audioPath = path.join(outputDir, "audio", `scene-${scene.id}.mp3`);
  const metadata = await parseFile(audioPath);
  scene.duration = metadata.format.duration!; // 用实际时长覆盖
}

// 回写 script.json
fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
```

`title-card` 等没有 TTS 的场景，`duration` 保留 Step 1 的估算值，Remotion 按估算值渲染静默帧。

### ElevenLabs 调用

```typescript
const response = await elevenlabs.generate({
  voice: process.env.ELEVENLABS_VOICE_ID,
  model_id: "eleven_multilingual_v2",
  text: scene.narration,
  // with_timestamps 参数名需对照最新 API 文档确认
});

// 音频写入 audio/scene-{id}.mp3
// 时间戳写入 audio/scene-{id}.timestamps.json（供字幕使用）
```

---

## Step 4：Remotion 视频合成

### Node.js 集成方式

Remotion 通过其官方 Node API（`@remotion/renderer`）以 headless 模式运行，**不启动开发服务器**：

```typescript
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

// bundle 产物缓存到 output/.remotion-bundle/，避免重复编译（耗时 30~90s）
const bundleLocation = await bundle({
  entryPoint: "src/remotion/Root.tsx",
  outDir: "output/.remotion-bundle",
});

// 将 script.json 数据作为 inputProps 传入
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: "VideoComposition",
  inputProps: { scenes: script.scenes, outputDir },
});

await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: "h264",
  outputLocation: path.join(outputDir, "final.mp4"),
  // publicDir 指向 outputDir，使 staticFile() 能正确解析音频路径
  publicDir: outputDir,
  inputProps: { scenes: script.scenes, outputDir },
});
```

### Remotion Composition 设计

`Root.tsx` 接收 `inputProps.scenes`，动态计算每个 scene 的帧偏移量后逐一渲染：

```typescript
// src/remotion/Root.tsx
export const VideoComposition: React.FC<{ scenes: Scene[]; outputDir: string }> = ({
  scenes,
  outputDir,
}) => {
  const fps = 30;

  // 计算每个 scene 的起始帧
  const sceneFrames = scenes.reduce<{ scene: Scene; from: number }[]>(
    (acc, scene) => {
      const prev = acc[acc.length - 1];
      const from = prev ? prev.from + Math.round(prev.scene.duration * fps) : 0;
      return [...acc, { scene, from }];
    },
    []
  );

  const totalFrames = sceneFrames.reduce(
    (sum, { scene }) => sum + Math.round(scene.duration * fps),
    0
  );

  return (
    <AbsoluteFill>
      {sceneFrames.map(({ scene, from }) => (
        <Sequence key={scene.id} from={from} durationInFrames={Math.round(scene.duration * fps)}>
          <SceneRenderer scene={scene} outputDir={outputDir} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

### 场景组件路由

```typescript
// SceneRenderer 根据 type 分发到对应组件
const SceneRenderer: React.FC<{ scene: Scene; outputDir: string }> = ({ scene, outputDir }) => {
  switch (scene.type) {
    case "title-card": return <TitleCard scene={scene} />;
    case "narration":  return <Narration scene={scene} outputDir={outputDir} />;
    case "code":       return <CodeScene scene={scene} outputDir={outputDir} />;
    case "broll":      return <BRoll scene={scene} outputDir={outputDir} />;  // MVP 降级为动态背景
  }
};
```

### 音频路径解析

Remotion 的 `staticFile()` API 在 headless 模式下解析相对于 `publicDir` 的路径。由于 `publicDir` 指向 `output/{slug}/`，音频引用方式为：

```typescript
// Narration.tsx
const audioSrc = staticFile(`audio/scene-${scene.id}.mp3`);
// 实际解析为：output/{slug}/audio/scene-{id}.mp3
```

---

## Step 3：B-roll 生成（完整版）

> **前提**：Seedance / Kling API 接入 spike 完成前，此步骤跳过，`broll` 场景降级为动态背景。

### 异步任务处理模式

视频生成模型通常是异步接口（提交任务 → 轮询状态 → 获取结果）：

```typescript
async function generateBRoll(scene: Scene, outputDir: string) {
  // 1. 提交任务
  const { taskId } = await videoApi.submit({ prompt: scene.visual_prompt });

  // 2. 轮询（5s 间隔，最多 3 分钟）
  const MAX_WAIT = 180_000;
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT) {
    await sleep(5000);
    const status = await videoApi.getStatus(taskId);
    if (status.state === "completed") return status.videoUrl;
    if (status.state === "failed") throw new Error(status.reason);
  }
  throw new Error("timeout");
}
```

### 并发与缓存

```typescript
import pLimit from "p-limit";
import { createHash } from "crypto";

const limit = pLimit(3); // 最多 3 个并发

const brollScenes = script.scenes.filter(s => s.type === "broll");
await Promise.all(
  brollScenes.map(scene =>
    limit(async () => {
      // 以 visual_prompt 的 SHA256 作为缓存 key
      const hash = createHash("sha256").update(scene.visual_prompt!).digest("hex");
      const cachePath = path.join(outputDir, "broll", "cache", `${hash}.mp4`);

      if (fs.existsSync(cachePath)) {
        // 复用缓存，跳过 API 调用
        fs.copyFileSync(cachePath, path.join(outputDir, "broll", `scene-${scene.id}.mp4`));
        return;
      }

      const videoUrl = await generateBRoll(scene, outputDir);
      await downloadFile(videoUrl, cachePath);
      fs.copyFileSync(cachePath, path.join(outputDir, "broll", `scene-${scene.id}.mp4`));
    })
  )
);
```

---

## 错误处理策略

| 错误类型 | 处理方式 | 原因 |
|---------|---------|------|
| Zod 校验失败（Step 1 或 pipeline 入口） | 抛错终止，打印具体字段 | 坏数据不值得继续跑 |
| 单个 scene TTS 失败 | 跳过该场景，记录，最后汇报 | 局部失败不应终止全局 |
| 单个 scene B-roll 生成超时/失败 | 降级为动态背景 | B-roll 是增强项，不是必需项 |
| B-roll 异步任务超时 | 3 分钟后降级，不无限等待 | 防止 pipeline 卡死 |

---

## 目录结构

```
7-0-article-to-video/
├── .claude/
│   └── skills/
│       └── gen-script/
│           └── SKILL.md          # /gen-script Skill 入口
├── src/
│   ├── pipeline.ts               # 主入口：Step 2~4 串行编排 + 断点续跑
│   ├── schema.ts                 # Zod schema（Script / Scene / TimestampEntry）
│   ├── steps/
│   │   ├── 1-script.ts           # Skill 调用：Claude 脚本生成 + 校验 + 写文件
│   │   ├── 2-tts.ts              # ElevenLabs TTS + 音频时长回写
│   │   ├── 3-broll.ts            # B-roll 生成（完整版，MVP 中 pipeline 跳过）
│   │   └── 4-compose.ts          # Remotion bundle + renderMedia
│   └── remotion/
│       ├── Root.tsx              # Composition 入口，动态帧序列编排
│       └── scenes/
│           ├── TitleCard.tsx
│           ├── Narration.tsx     # 动态背景 + 整句字幕（MVP）
│           ├── CodeScene.tsx     # 代码高亮 + 打字机动画
│           └── BRoll.tsx         # B-roll 素材（完整版）/ 动态背景降级（MVP）
├── input/                        # 待处理的 Markdown 文章
├── output/
│   └── {slug}/                   # 每篇文章独立隔离
│       ├── script.json           # Skill 产物，人工确认后 pipeline 消费
│       ├── audio/                # TTS 音频 + timestamps
│       ├── broll/                # B-roll 素材 + 缓存
│       ├── .remotion-bundle/     # Remotion 编译缓存
│       ├── .step2.done           # 断点续跑标记
│       ├── .step3.done
│       ├── .step4.done
│       └── final.mp4
├── .env.example
├── docs/
│   ├── requirements.md
│   └── technical-design.md      # 本文件
└── package.json
```

---

## 关键设计决策

**`script.json` 作为系统枢纽**：两个独立单元通过文件解耦，而非函数调用，是为了保留人工介入的空间。脚本是创意产物，需要反复迭代，文件比 API 调用更便于查看和修改。

**Step 2 回写 `duration`**：Claude 预估的时长和 TTS 实际输出时长必然有偏差。让估算值作为最终时间轴依据会导致音画不同步。回写机制让 `duration` 在 Step 4 时永远等于实际音频长度，是时间轴正确的前提。

**Remotion bundle 缓存**：`bundle()` 每次调用需要 30~90 秒编译 Remotion composition。把产物缓存到 `output/.remotion-bundle/` 后，重跑时直接复用，只有 Remotion 代码变更才需要重新编译。

**B-roll 缓存用 prompt 哈希**：同一段描述反复调用视频生成 API 是纯粹的浪费。以 `visual_prompt` 的 SHA256 为 key 的缓存策略，确保只要描述不变就复用上次的结果，在调试阶段尤其重要。

**`publicDir` 指向 `output/{slug}/`**：Remotion headless 渲染时，`staticFile()` 解析路径依赖 `publicDir` 参数。将其指向 slug 子目录，使音频路径 `audio/scene-1.mp3` 能正确解析，同时不同文章之间互不干扰。
