import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { type Script } from "../schema";
import { VisualSpecSchema, type VisualSpec } from "../visual-schema";

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一个技术视频视觉设计师。根据场景旁白，生成一段结构化的视觉内容脚本，用于驱动 Remotion 动态渲染图形。

从以下 5 种图形类型中选择最合适的一种，输出严格的 JSON：

━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. sequence（时序图）
   适用：协议握手、请求/响应流程、消息传递
   格式：
   {"type":"sequence","actors":[{"id":"A","label":"显示名"}],"messages":[{"from":"A","to":"B","label":"消息名","dashed":false}]}

2. layer（分层架构图）
   适用：协议栈、OSI 模型、系统架构分层
   格式：
   {"type":"layer","layers":[{"label":"层名","color":"#6366f1","nodes":[{"label":"组件","sublabel":"说明"}]}]}

3. flow（流程图）
   适用：算法流程、状态机、决策树、加解密过程
   格式：
   {"type":"flow","nodes":[{"id":"n1","label":"步骤","color":"#6366f1"}],"edges":[{"from":"n1","to":"n2","label":"条件"}]}

4. compare（对比图）
   适用：两种方案对比，如 HTTP vs HTTPS、对称 vs 非对称加密
   格式：
   {"type":"compare","left":{"label":"A","items":["特点1","特点2"],"color":"#ef4444"},"right":{"label":"B","items":["特点1","特点2"],"color":"#22c55e"}}

5. mindmap（概念扩散图）
   适用：某个核心概念及其组成部分/关联概念
   格式：
   {"type":"mindmap","center":"核心概念","branches":[{"label":"分支","items":["细节1","细节2"]}]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
要求：
- 只输出 JSON，不要 markdown 代码块、不要注释
- 内容语言与旁白一致（中文旁白用中文标签）
- sequence: actors ≤ 4，messages ≤ 10
- layer: layers 2-6，每层 nodes ≤ 4
- flow: nodes 3-8，edges ≤ 10
- compare: items ≤ 6 条
- mindmap: branches 3-6，每分支 items ≤ 3`;

// ── 生成单个场景的 visual_spec ────────────────────────────────────────────────

async function generateVisualSpec(
  client: Anthropic,
  narration: string,
  visualHint?: string
): Promise<VisualSpec | null> {
  const userContent = [
    visualHint ? `视觉提示：${visualHint}` : null,
    `旁白内容：${narration}`,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // 提取 JSON（Claude 偶尔会包一层 ```json）
  const clean = text
    .replace(/```(?:json)?\s*/g, "")
    .replace(/```/g, "")
    .trim();

  const jsonMatch = clean.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return VisualSpecSchema.parse(parsed);
  } catch {
    return null;
  }
}

// ── 导出给 pipeline 调用 ────────────────────────────────────────────────────

export async function runBRoll(script: Script, outputDir: string): Promise<void> {
  const visualsPath = path.join(outputDir, "visuals.json");

  // 加载已有结果（支持断点续跑）
  const existing: Record<string, VisualSpec> = fs.existsSync(visualsPath)
    ? JSON.parse(fs.readFileSync(visualsPath, "utf-8"))
    : {};

  const client = new Anthropic({
    baseURL: process.env.ANTHROPIC_BASE_URL,
    apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  });

  const targets = script.scenes.filter(
    (s) => s.type === "narration" || s.type === "broll"
  );
  console.log(`  共 ${targets.length} 个场景需要生成 visual_spec`);

  for (const scene of targets) {
    const key = String(scene.id);
    if (existing[key]) {
      console.log(`  Scene ${scene.id}: 已有 visual_spec，跳过`);
      continue;
    }

    process.stdout.write(`  Scene ${scene.id}: 生成 visual_spec...`);
    try {
      const spec = await generateVisualSpec(client, scene.narration, scene.visual_prompt);
      if (spec) {
        existing[key] = spec;
        // 每生成一条立即落盘，避免中断丢失
        fs.writeFileSync(visualsPath, JSON.stringify(existing, null, 2), "utf-8");
        process.stdout.write(` ✓ (${spec.type})\n`);
      } else {
        process.stdout.write(` ⚠ 解析失败\n`);
      }
    } catch (err: any) {
      process.stdout.write(` ✗ ${err.message}\n`);
    }
  }

  console.log(`  visual_spec 已保存: ${visualsPath}`);
}
