"use client"

import { ChatMessage } from "@/components/chat-message"

export default function Home() {
  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-lg p-xl">
      <header className="flex flex-col gap-xs">
        <h1 className="text-2xl text-foreground-heading">智能知识问答系统</h1>
        <p className="text-sm text-foreground-muted">
          ChatMessage 组件演示：角色区分、markdown 渲染、加载中、错误重试。
        </p>
      </header>

      <section className="flex flex-col gap-lg">
        {/* 用户提问 */}
        <ChatMessage role="user" content="Drizzle 里 pgvector 的相似度检索怎么写？" />

        {/* assistant 完整回答（markdown + 命中依据） */}
        <ChatMessage
          role="assistant"
          status="done"
          grounded
          content={`用内置的 \`cosineDistance\`（即 \`<=>\` 运算符）即可：

1. \`embedding\` 列用 \`vector({ dimensions: 1024 })\` 建模
2. 检索时按 **余弦距离**升序取 \`RETRIEVAL_TOP_K\` 条

\`\`\`ts
const rows = await db
  .select()
  .orderBy(cosineDistance(chunks.embedding, queryVec))
  .limit(5)
\`\`\`

> HNSW 索引与扩展启用一并写进 migration。`}
        />

        {/* assistant 常识推测（未命中依据） */}
        <ChatMessage
          role="assistant"
          status="done"
          grounded={false}
          content="文档里没有直接依据，以下属常识推测：一般建议向量维度与 embedding 模型输出保持一致。"
        />

        {/* 流式等待首 token（打字指示器） */}
        <ChatMessage role="assistant" status="streaming" content="" />

        {/* 错误 / 中断态（重试入口） */}
        <ChatMessage
          role="assistant"
          status="error"
          errorMessage="模型响应超时（LLM_TIMEOUT）"
          onRetry={() => console.log("retry")}
        />
      </section>
    </main>
  )
}
