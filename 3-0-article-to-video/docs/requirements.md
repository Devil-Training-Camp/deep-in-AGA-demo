# 文章转视频 Pipeline —— 需求说明

## 背景与目标

个人使用的文章转视频工具：**输入一篇技术文章，经过人工确认分镜脚本后，自动输出一个可发布的视频**。

最耗时的环节是"讲稿准备"——把文章语言改成适合视频旁白的口语风格，并拆分成场景。这一步交给 Claude 来做，但生成的脚本往往需要人工调整（改节奏、砍场景、改旁白措辞），所以**脚本生成是一个独立的迭代环节**，而不是自动化 Pipeline 的一部分。

**整体工作流**：

```
[/gen-script Skill]          —— Claude 生成分镜脚本 → 人工审阅/调整脚本文件
         ↓（确认满意）
[pipeline.ts（Step 2~4）]    —— 自动执行：TTS → B-roll → 视频合成
```

---

## MVP Scope

整体分为两个独立部分，分开实现、分开使用：

- **`/gen-script` Skill**：Claude Code Skill，负责脚本生成。输入文章路径，输出 `output/{slug}/script.json`，供人工审阅修改。`{slug}` 取文章文件名去掉扩展名（如 `2-2-mcp-intro.md` → slug 为 `2-2-mcp-intro`）。
- **`pipeline.ts`**：自动化执行脚本，接收 `script.json` 文件路径，从路径推导 slug（取所在目录名），串行执行 Step 2~4，所有产物写入同一目录。

文件结构中保留 `1-script.ts`，但它被 `/gen-script` Skill 调用，**不再是 `pipeline.ts` 的一部分**。

### MVP（第一个可运行版本）

```
① /gen-script <article.md>        # 调用 Skill，生成 output/{slug}/script.json
   → 人工审阅、按需修改 script.json
   → 确认满意后继续

② pnpm pipeline output/{slug}/script.json   # 传脚本路径，slug 从路径自动推导
      ↓
   [Step 2] ElevenLabs —— TTS + 时长回写
      ↓
      ※ Step 3 MVP 跳过（broll 场景由 Remotion 内置背景占位）
      ↓
   [Step 4] Remotion —— 合成视频
      ↓
   output/{slug}/final.mp4
```

### 完整版（后续迭代）

`pipeline.ts` 中补充 Step 3：调用视频生成模型为 `broll` 场景生成真实 B-roll 素材。前提：**必须先完成 API 接入 spike（见"待解决的阻断性问题"）**，确认 API 可用后再开发。

---

## Pipeline 详细设计

### Step 1：脚本生成（Claude API）

**输入**：文章 Markdown 文本

**输出**：结构化分镜脚本 JSON，存为 `output/{slug}/script.json`

```typescript
// 脚本 JSON 类型定义（同时作为 Zod schema 的基础）
type Script = {
  title: string;                  // 视频标题
  total_duration: number;         // 预估总时长（秒，由各 scene duration 求和）
  scenes: Scene[];
};

type Scene = {
  id: number;                     // 从 1 开始的全局唯一整数（多段合并后需重新排序）
  type: "narration" | "code" | "broll" | "title-card";
  narration: string;              // 旁白文字；title-card 可为 ""，TTS 会跳过空字符串
  visual_prompt?: string;         // 画面描述（英文）；仅 broll 类型必填，其余类型省略
  duration: number;               // 时长（秒）；TTS 场景在 Step 2 后被实际音频时长覆盖
                                  // title-card 等跳过 TTS 的场景保留 Step 1 的估算值
  code_snippet?: string;          // 仅 type=code 时必填
};
```

**场景类型定义**：

| type | 触发条件 | narration | visual_prompt | code_snippet |
|------|---------|-----------|---------------|--------------|
| `title-card` | 视频开头、章节过渡 | 可为空 | 不需要 | 不需要 |
| `narration` | 纯文字叙述段落，无显著视觉主体 | 必填 | 不需要 | 不需要 |
| `code` | 涉及代码讲解的段落，需要展示代码 | 必填 | 不需要 | 必填 |
| `broll` | 需要配合具体视觉画面的叙述（演示效果、架构图、操作流程等） | 必填 | 必填（英文，≥20字） | 不需要 |

**输入预处理规则**（在调用 Claude 前处理）：

- **文章过长（超过 80k tokens）**：按 H2 标题分段，每段单独生成脚本，最后合并；合并后对所有 scene 的 `id` 做全局重新递增排序（各段均从 1 开始，不合并会导致 `scene-{id}.mp3` 文件名冲突）
- **Markdown 图片**：提取 alt text 作为视觉描述参考，忽略图片 URL
- **代码块**：保留原始代码，对应场景强制设为 `type=code`
- **表格**：转为旁白描述，不直接展示表格（Remotion 渲染表格成本高）
- **外链/脚注**：忽略，不进入旁白

**关键要求**：
- 旁白语气适合视频播报，不能照搬文章原句
- `visual_prompt` 必须用英文，描述具体可渲染的画面
- 整体节奏控制在 5~10 分钟（scene 总数建议 12~25 个，单 scene 时长 3~30 秒）
- Step 1 完成后，在 `1-script.ts` 中用 Zod 做 strict 校验，任何字段不符合类型立即抛错

---

### Step 2：语音合成（ElevenLabs）

**输入**：`output/{slug}/script.json` 中所有 `narration` 非空的场景

**输出**：
- 每个场景对应一个音频文件：`output/{slug}/audio/scene-{id}.mp3`
- 每个场景对应一个时间戳文件：`output/{slug}/audio/scene-{id}.timestamps.json`（用于字幕对齐）
- **完成后回写 `output/{slug}/script.json`**：用 `ffprobe` 或 `music-metadata` 读取实际音频时长，覆盖对应 scene 的 `duration` 字段

> ⚠️ **时间轴设计关键**：TTS 输出时长不可预测（同样文字因语速不同可能差 1~2 秒）。Step 2 完成后，`script.json` 里的 `duration` 必须是实际音频时长，不再是 Step 1 的估算值。Remotion 的 `durationInFrames` 全部依赖这个回写后的值。

**API 调用要求**：
- 模型必须使用 `eleven_multilingual_v2`（中文支持）
- 请求参数加 `with_timestamps: true`，返回值中提取每个词的时间戳存为 `.timestamps.json`
- `narration` 为空字符串的场景（`title-card` 等）直接跳过，不发 TTS 请求；跳过的场景 `duration` 保留 Step 1 的估算值，Remotion 直接使用
- `voice_id` 通过 `.env` 配置，默认值见 `.env.example`（建议开发前在 ElevenLabs Playground 试听中文效果）
- 实现前需先调一次 API 确认中文 `timestamps` 的返回字段结构（字段名、是字符级还是词组级），并在 `schema.ts` 中补充 `TimestampEntry` 类型定义，避免 Remotion 端字幕实现时字段对不上

---

### Step 4：视频合成（Remotion）

**适用范围**：MVP 阶段，全部场景由 Remotion 渲染，不依赖外部视频素材。

**输入**：回写后的 `output/{slug}/script.json` + `output/{slug}/audio/` 目录下的音频和时间戳文件

**输出**：`output/{slug}/final.mp4`

**各场景渲染策略**：

| type | 视觉方案 | 音频 |
|------|---------|------|
| `title-card` | 居中大字 + 品牌色渐变背景动画 | 无（静默） |
| `narration` | Remotion 内置粒子/渐变动态背景 | scene 对应音频 |
| `code` | 代码高亮渲染 + 打字机出现动画 | scene 对应音频 |
| `broll` | MVP 降级：同 narration，用动态背景占位 | scene 对应音频 |

**字幕方案**：
- MVP 优先使用整句字幕（narration 全文一次显示），实现简单；精确卡拉 OK 式逐词高亮作为 nice-to-have，待 ElevenLabs timestamps 格式确认后实现
- 若 `.timestamps.json` 缺失（TTS 跳过的场景），该场景无字幕

**Remotion 与 Pipeline 的集成方式**：
- `4-compose.ts` 通过 `@remotion/renderer` 的 `bundle()` + `renderMedia()` Node API 直接调用，不需要单独启动 Remotion 开发服务器
- `bundle()` 产物固定输出到 `output/.remotion-bundle/`，避免每次运行重新编译（编译耗时 30~90s）
- Scene 数据通过 `inputProps` 传入 Remotion composition，composition 根据 `inputProps.scenes` 动态生成帧序列
- 音频素材通过约定路径（`output/{slug}/audio/scene-{id}.mp3`）读取；headless 渲染时需通过 `renderMedia()` 的 `publicDir` 参数指向 `output/{slug}/` 目录，使 `staticFile()` API 正确解析路径

**输出规格**（默认值，通过 `.env` 可覆盖）：分辨率 1920×1080，帧率 30fps，编码 H.264

---

### Step 3-Full：B-roll 生成（视频生成模型）

> ⚠️ **前提**：必须先完成 Seedance/Kling API 接入 spike，确认 API 可用后再实现本步骤。

**适用范围**：完整版，仅处理 `type=broll` 的场景，替换 MVP 的动态背景占位。

**输入**：`type=broll` 场景的 `visual_prompt` + 对应的 `duration`

**输出**：`output/{slug}/broll/scene-{id}.mp4`

**候选模型**：
- Seedance（字节，火山引擎）：优先验证，需确认 VideoGen API 是否开放及申请方式
- Kling 2.0（快手）：备选，有开发者 API，需申请配额
- Runway Gen-3：质量高，成本较高，作为最终保底

**实现要点**：
- 视频生成模型通常输出固定时长（4s/8s），不支持任意时长。B-roll 按模型支持的最近档位生成（如 8s），在 Remotion 里超出部分 fade out，不足部分 loop 并用转场遮盖
- 并发控制：用 `p-limit` 限制最多 3 个并发请求，避免触发 rate limit
- 缓存策略：以 `visual_prompt` 的 SHA256 哈希值命名缓存文件（`output/{slug}/broll/cache/{hash}.mp4`），prompt 未变则复用缓存，不重复调用 API

---

## 数据流与目录约定

```
output/
├── {slug}/                  # 每篇文章独立子目录，slug = 文章文件名去掉扩展名
│   ├── script.json          # /gen-script 生成，人工确认后供 pipeline 消费
│   │                        # Step 2 完成后 duration 字段被实际音频时长回写
│   ├── audio/
│   │   ├── scene-1.mp3
│   │   ├── scene-1.timestamps.json
│   │   ├── scene-2.mp3
│   │   └── ...
│   ├── broll/               # Step 3-Full 输出（仅 broll 类型）
│   │   ├── scene-5.mp4
│   │   └── cache/           # prompt 哈希缓存，避免重复生成
│   │       └── {hash}.mp4
│   ├── .remotion-bundle/    # Remotion bundle 缓存，避免重复编译
│   └── final.mp4            # Step 4 最终输出
└── ...                      # 其他文章的子目录
```

**断点续跑**：每个 Step 完成后写入完成标记（`output/{slug}/.step2.done` 等），下次运行前检查标记，已完成的 Step 直接跳过。`--force` 参数可清除所有标记强制重跑。

---

## 错误处理策略

- **单个 scene TTS 失败**：跳过该场景（narration 置空，Remotion 渲染静默帧），不终止整个 pipeline，完成后汇报失败场景列表
- **单个 scene B-roll 生成失败**：降级为动态背景占位，不终止 pipeline
- **Step 1 脚本 Zod 校验失败**：立即抛错，打印具体字段和值，终止后续步骤（脚本质量是下游的基础，不值得带着坏数据继续跑）
- **视频生成模型异步任务**：轮询间隔 5 秒，最大等待 3 分钟，超时后降级为动态背景

---

## 技术选型

| 环节 | 选型 | 理由 |
|------|------|------|
| 脚本生成 | Claude API (`claude-opus-4-6`) | 长文理解 + 结构化输出稳定 |
| 输出校验 | Zod | 运行时 schema 校验，字段级错误提示 |
| 语音合成 | ElevenLabs (`eleven_multilingual_v2`) | 中文 TTS 质量高，支持词级时间戳 |
| 视频合成（MVP） | Remotion | React 驱动，前端友好，代码动画精确可控 |
| B-roll 生成（完整版） | Seedance / Kling（待 spike 确认） | 优先国内模型 |
| 时长读取 | `music-metadata`（npm） | 轻量，读取 mp3 实际时长 |
| 并发控制 | `p-limit` | 控制外部 API 并发数 |
| 运行时 | Node.js >= 22 | 与课程其他 Demo 保持一致 |

---

## 目录结构

```
7-0-article-to-video/
├── docs/
│   └── requirements.md
├── .claude/
│   └── skills/
│       └── gen-script/
│           └── SKILL.md             # /gen-script Skill 定义（调用 1-script.ts）
├── src/
│   ├── pipeline.ts                  # Step 2~4 自动执行，读取已确认的 script.json
│   ├── steps/
│   │   ├── 1-script.ts              # 脚本生成逻辑（被 /gen-script Skill 调用，不在 pipeline 中）
│   │   ├── 2-tts.ts                 # ElevenLabs TTS + 时长回写
│   │   ├── 3-broll.ts               # B-roll 生成（完整版，MVP 跳过）
│   │   └── 4-compose.ts             # Remotion 渲染
│   ├── remotion/
│   │   ├── Root.tsx                 # Remotion composition 入口
│   │   └── scenes/
│   │       ├── TitleCard.tsx
│   │       ├── Narration.tsx        # 含动态背景 + 字幕
│   │       ├── CodeScene.tsx        # 代码高亮 + 打字机动画
│   │       └── BRoll.tsx            # B-roll 素材（完整版）或动态背景（MVP）
│   └── schema.ts                    # Zod schema（Script / Scene / TimestampEntry 类型）
├── input/                           # 放置待转换的 Markdown 文章
├── output/                          # 所有中间产物和最终视频，按文章 slug 分子目录
│   └── {slug}/                      # 示例：2-2-mcp-intro/
│       ├── script.json              # /gen-script 生成，人工确认后供 pipeline 消费
│       └── final.mp4                # pipeline 最终输出
├── .env.example
└── package.json
```

---

## 待解决的阻断性问题

> 以下问题必须在对应 Step 开发前解决，其余均已有默认值可推进。

- [ ] **[阻断 Step 3-Full]** Seedance API 接入 spike：确认火山引擎 VideoGen API 是否开放、申请方式、调用格式（REST or SDK）、异步任务轮询方式。如果无法接入，改用 Kling 2.0 或 Runway Gen-3

## 默认值已确定的配置项

> 无需讨论，直接写入 `.env.example`：

- ElevenLabs voice_id：默认使用 `pNInz6obpgDQGcFmaJgB`（Adam，支持中文），开发前在 Playground 确认效果后可替换
- 视频输出分辨率：`1920x1080`，帧率 `30fps`
- narration 场景视觉方案：MVP 阶段统一使用 Remotion 内置渐变动画背景
- 字幕方案：MVP 用整句字幕（narration 全文一次显示）；ElevenLabs 调用时仍加 `with_timestamps: true`（参数名需对照最新 API 文档确认），为后续卡拉 OK 式字幕（nice-to-have）保留数据
