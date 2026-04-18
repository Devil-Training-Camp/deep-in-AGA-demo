---
name: gen-script
description: 将指定 Markdown 文章转换为结构化分镜脚本，输出到 output/{slug}/script.json
---

根据用户提供的文章路径，执行以下步骤生成分镜脚本：

## 执行步骤

1. 确认用户提供了文章路径参数（如 `input/2-2-mcp-intro.md`）
2. 运行脚本生成命令：

```bash
cd demos/7-0-article-to-video && node --env-file=.env.local --import tsx/esm src/steps/1-script.ts <article-path>
```

将 `<article-path>` 替换为用户传入的实际路径。

3. 命令执行成功后，告知用户：
   - 脚本已写入 `output/{slug}/script.json`（slug 为文章文件名去掉扩展名）
   - 提示用户打开并审阅 script.json，确认分镜内容和时长合理
   - 满意后执行：`pnpm pipeline output/{slug}/script.json`

## 注意事项

- 若文章超过 80k tokens，脚本会自动按 H2 分段生成再合并，耗时会更长
- Zod 校验失败时会打印具体字段，根据错误信息判断是否需要重试
- script.json 中的 `duration` 是 Claude 估算值，Step 2（TTS）完成后会被实际音频时长覆盖
