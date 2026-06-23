---
name: gen-script
description: 交互式把一篇 Markdown 技术文章转成视频分镜脚本（02-script.json），按 src/schema 的 ScriptSchema 输出，与用户逐步确认后写入并接入渲染管线。当用户运行 /gen-script <article.md>、或要求从文章生成视频分镜脚本/storyboard/口播脚本时使用。
---

# /gen-script —— 交互式视频分镜脚本生成

把一篇 Markdown 技术文章交互式转成符合 `src/schema/scene.ts` 中 `ScriptSchema` 的分镜脚本。**先与用户确认，再落盘**，最后接入渲染管线。

输入：文章路径作为参数（`/gen-script <article.md>`）。没给路径就先问用户要。

## 执行流程

### 1. 对齐格式（先读，别凭记忆）
- 读文章全文。
- 读 `src/schema/scene.ts`（`ScriptSchema` 的唯一真相）确认四类场景字段；必要时参考 `docs/technical-design.md` §关键数据结构。**代码与文档冲突时以 `src/schema/scene.ts` 为准。**

### 2. 按「场景切分规则」把文章切成有序场景
见下方规则，严格保留原文叙事顺序。

### 3. 按「时长估算假设」算每段与全片预估时长
见下方假设。

### 4. 预算检查
- 目标 ≤ 5 分钟（口播总字数约 1200~1500 字）。
- 估算总时长 > 5 分钟 或 口播总字数 > 1500：明确告诉用户超了多少，建议**压缩**（合并场景／精简口播／删次要内容），而不是硬塞。

### 5. 与用户交互确认（关键：先别写文件）
用一张可读的表格展示提议的分镜，至少含：场景号、type、口播摘要（或"静音"）、bullets/代码/图片摘要、预估时长；末尾给全片总时长与口播总字数。然后主动问用户要不要调整（合并/拆分/改口播/换类型/增删/改高亮行）。**迭代到用户明确认可为止**，不要一上来就落盘。

### 6. 校验并写入（确认后才做）
1. 构造 `{ "scenes": [...] }`，每个场景**只含** `type` + 该类型的可视字段 + `narration`。**不要输出** `id` / `estimatedDuration` / `scroll`（这三个由 pipeline 派生，写了也会被覆盖）。
2. 把它写到一个临时文件，例如 `output/_gen-script.tmp.json`。
3. 运行落地脚本（它按 `ScriptSchema` 校验、写入 job 的 `02-script.json`、并 seed 状态使渲染时不被自动生成覆盖）：
   ```bash
   npx tsx src/import-script.ts <article.md> output/_gen-script.tmp.json
   ```
4. 校验若失败，脚本会打印 zod 报错——按报错修正 JSON 再跑，别改 schema。
5. 成功后删掉临时文件，把脚本打印的「渲染命令」转告用户（`run … --render`，不计费试渲加 `--dry-run`）。

---

## 场景切分规则（具体）

1. **文章 H1（一级标题）** → 1 个 `title` 封面：`title` 取 H1 文本，`subtitle` 你提炼的一句钩子（可选），`narration=""`（静音，纯入场动画）。
2. **章节 H2/H3** → `title` 分节卡：`title` 取标题文本，`narration=""`（或一句 ≤15 字的极短过渡旁白）。别给每个小节都配长旁白。
3. **正文段落** → `narration` 场景：把 **1~3 个讲同一件事的相邻段落合并**成一个场景，目标每段口播 15~30 秒（约 70~140 字）。**不要一段一个场景**（太碎）。从中提炼 2~4 条 `bullets`（每条 ≤12 字的短句）作屏幕要点。
4. **代码块** → `code` 场景：`code` 取原代码原文；`language` 取围栏语言并归一化（`js→javascript`、`ts→typescript`、`sh→bash`、`yml→yaml`；不认识的填 `plaintext`）；`narration` 用 1~3 句讲解这段代码（配合画面，短代码可一句带过）；`highlightLines` 填要强调的行号、**0-indexed（首行 = 0）**、可省。`scroll` 不要写（长码滚动由 pipeline 按行数派生）。
5. **图片 `![alt](path)`** → `image` 场景：`imagePath` 取原始路径原样；`caption` 取 alt 文本或一句短标注（可选）；`narration` 用 1~2 句解说。
6. **表格** → 降级为 `narration` 场景，把每行要点转成 `bullets`。
7. **行内链接** → 口播去掉 URL、保留锚文本；**列表 / 引用块** → 并入相邻 narration 场景的 `bullets`。
8. **数学公式（LaTeX）** → MVP 不渲染，在口播里用文字描述带过或跳过。

**叙事顺序**：场景顺序严格跟随原文。典型结构：封面 `title` → 引入 `narration` →（分节 `title` → `narration`(s) → `code` → `narration`）×N → 收尾 `narration`。

**口播写法**：中文口语，能"听懂"，适当改编、压缩，不是书面语照搬；保留必要英文术语（如 `useMemo`、`AbortController`）让朗读自然。

---

## 时长估算假设（明确）

- **中文口播语速假设 = 4.5 字/秒**（与 pipeline `estimateCharsPerSec` 默认一致）。某段 `narration` 预估秒数 ≈ `ceil(narration 字数 ÷ 4.5)`。
- **静音场景**（`narration=""` 的 title / 分节卡）：时长由入场动画定，按**最短动画 2.5 秒**估（与 config `minSceneSec` 默认一致）。
- **每个场景最终预估时长 ≈ `max(口播秒数, 最短动画 2.5s) + 留白 0.4s`**（留白 = config `scenePaddingSec` 默认）。
- **全片预估总时长 = 各场景之和**；口播总字数 = 各 `narration` 字数之和。
- 这些是**估算**，用于发车前的预算检查和给用户看；**真值由 pipeline 量音频后定**（`estimatedDuration` 你不必输出）。

---

## ScriptSchema 速查（以 `src/schema/scene.ts` 为准）

`{ "scenes": Scene[] }`，`Scene` 按 `type` 区分的可辨识联合：

| type | 必填可视字段 | 可选可视字段 |
|------|------------|------------|
| `title` | `title` | `subtitle` |
| `narration` | （无，靠 narration） | `bullets: string[]` |
| `code` | `code`, `language` | `highlightLines: number[]`（0-indexed） |
| `image` | `imagePath` | `caption` |

公共字段：`narration: string`（**必填**，`""` 表示静音）。

**不要输出** `id` / `estimatedDuration` / `scroll` —— 它们在 schema 里是 optional、由 pipeline 派生，写了会被 `enrichScript` 覆盖。

示例（一个静音封面 + 一个旁白 + 一个代码场景）：
```json
{
  "scenes": [
    { "type": "title", "narration": "", "title": "文章标题", "subtitle": "一句钩子" },
    { "type": "narration", "narration": "这里是一段中文口语旁白……",
      "bullets": ["要点一", "要点二"] },
    { "type": "code", "narration": "讲解这段代码做了什么。",
      "code": "const x = 1;", "language": "javascript", "highlightLines": [0] }
  ]
}
```

---

## 自检清单（落盘前）

- [ ] 场景顺序与原文一致？
- [ ] 每个 `narration` 是中文口语、不是书面语照搬？
- [ ] 口播总字数 ≤ ~1500、估算总时长 ≤ 5 分钟？超了已与用户商量压缩？
- [ ] `code` 的 `language` 已归一化？`highlightLines` 是 0-indexed？
- [ ] 没有输出 `id` / `estimatedDuration` / `scroll`？
- [ ] 用户已明确认可这版分镜？
- [ ] 已用 `src/import-script.ts` 校验通过、并删除临时文件？
