# 文章转视频 Pipeline (@demos/3-2-article-to-video)

把一篇技术文章(Markdown)转成一条 ≤5 分钟、可直接发布的视频(`final.mp4` + 外挂 `subtitles.srt`)的命令行工具。

当前处于设计完成、待编码阶段。**实现逻辑不在本文件**——管线八步的执行机制、断点续跑的哈希比对、TTS/字幕的降级链等,见 `docs/`:

- `docs/requirements.md` —— 需求规格(约束、场景类型、时间轴规则、MVP 范围)
- `docs/technical-design.md` —— 技术选型、数据结构(Zod schema)、外部 API 集成方式
- `docs/design-overview.md` —— 关键决策的推导过程(D1~D5)

需要某步怎么做时按需查阅上述文档,不要凭记忆实现。

## 技术栈

| 角色 | 选型 |
|------|------|
| 运行时 / 语言 | Node.js (>=22.16.0) + TypeScript,CLI 入口 |
| Markdown 解析 | `unified` + `remark-parse`(mdast) |
| LLM(改写/分镜) | Claude,`@anthropic-ai/sdk`,默认 `claude-opus-4-8`(可配置切 `claude-sonnet-4-6`) |
| 结构化输出 | `messages.parse()` + `zodOutputFormat`,schema 用 `zod` |
| TTS | ElevenLabs `with-timestamps` 接口,模型 `eleven_multilingual_v2` |
| 代码高亮 | Shiki(`react-shiki`)+ Shiki Magic Move |
| 视频合成 | Remotion(`@remotion/bundler` + `@remotion/renderer`),编程式渲染 |
| 片段拼接 | ffmpeg(concat),需本地安装 ffmpeg/ffprobe |

## 硬约束

这些是已锁定的输出规格与设计约束,编码时不得偏离:

- 输出视频:横屏 16:9,1920×1080,30fps,mp4(H.264 + AAC),时长 ≤5 分钟。
- 字幕外挂为 `subtitles.srt`,**不烧录进画面**——改字幕无需重渲。
- 四类场景:`title` / `narration` / `code` / `image`,以 `type` 区分的 Zod 可辨识联合(定义见 technical-design.md)。
- 配图只用文章自带图(Markdown 的 `![]()`);AI 生成图、Mermaid、视频生成(B-roll)均不实现,接口预留。
- 时间轴:`场景时长 = max(音频时长, 最短动画时长) + 留白`;`durationInFrames = ceil(场景时长秒 × 30)`。
- 输入仅接受本地 `.md` 文件路径。

## 目录结构

源码尚未搭建。`docs/` 为设计文档;运行时产物按 job 隔离写入 `output/`(已 gitignore):

```
output/
  <job-id>/                # job-id = 日期-文章slug
    source.md              # 输入文章副本
    01-parsed.json         # 结构化内容
    02-script.json         # 脚本 + 分镜(人工审阅/编辑对象)
    audio/scene-XXX.mp3    # 逐场景音频
    clips/scene-XXX.mp4    # 逐场景渲染片段
    subtitles.srt
    final.mp4
    state.json             # 进度 + 输入哈希(断点续跑依据)
```

Remotion 组件入口约定为 `remotion/index.ts`(technical-design.md 引用),每个场景对应一个 composition。

## 编码规范

通用 React/TS 规范(继承自仓库根 CLAUDE.md):组件单一职责、建议 ≤200 行,重复状态逻辑抽成自定义 hooks,依赖通过 props 注入,纯函数组件优于类组件。

本项目特有约定:

- LLM 产物(步骤 2/3)一律走 `messages.parse()` + `zodOutputFormat`,`parsed_output` 为 `null` 即按失败重试;不要手写 JSON 解析。
- 用**同一份** `ScriptSchema` 约束 AI 输出和人工编辑的 `02-script.json`,两端校验一致。
- Opus 4.8 / Sonnet 4.6 **不支持** `temperature` / `budget_tokens`,用 `thinking: { type: "adaptive" }` 控制思考。
- Remotion 渲染**串行逐场景**进行,不并发(单个渲染即吃满机器);多 job 也要限并发。
- 代码滚动动画用 `useCurrentFrame()` + `interpolate()` 驱动 `translateY`,**不要用 CSS 滚动**(保证逐帧确定性)。
- 音频时长由 pipeline 侧 `ffprobe` 量取后经 inputProps 传入 Remotion,Remotion 不自行探测。
- 术语纠音用别名替换(送 TTS 前替换文本),中文不支持音素级发音词典。

## 常用命令

```bash
# 仓库根目录安装全部 demo 依赖
pnpm install

# 仅本 demo(脚手架就绪后)
pnpm --filter @demos/3-2-article-to-video install

# 开发期用 Remotion Studio 调试组件(渲染走编程式 API,无需开发服务器)
npx remotion studio
```

CLI 运行入口与 npm scripts 待脚手架落地后补充。

## 环境变量

API Key 走 `.env`(已 gitignore,不提交):`ANTHROPIC_API_KEY`、`ELEVENLABS_API_KEY`。
