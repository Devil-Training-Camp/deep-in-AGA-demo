import type { Meta, StoryObj } from "@storybook/nextjs";

import { ChatMessage } from "@/components/chat-message";

const meta = {
  title: "Chat/ChatMessage",
  component: ChatMessage,
  parameters: { layout: "padded" },
  argTypes: {
    role: { control: "inline-radio", options: ["user", "assistant"] },
    status: { control: "inline-radio", options: ["streaming", "done", "error"] },
    grounded: { control: "boolean" },
  },
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserMessage: Story = {
  args: {
    role: "user",
    content: "Drizzle 里 pgvector 的相似度检索怎么写？",
  },
};

export const AssistantGrounded: Story = {
  args: {
    role: "assistant",
    status: "done",
    grounded: true,
    content: `用内置的 \`cosineDistance\`（即 \`<=>\` 运算符）即可：

1. \`embedding\` 列用 \`vector({ dimensions: 1024 })\` 建模
2. 检索时按 **余弦距离**升序取 \`RETRIEVAL_TOP_K\` 条

> HNSW 索引与扩展启用一并写进 migration。`,
  },
};

export const AssistantSpeculation: Story = {
  args: {
    role: "assistant",
    status: "done",
    grounded: false,
    content: "文档里没有直接依据，以下属常识推测：向量维度一般与 embedding 模型输出保持一致。",
  },
};

export const Loading: Story = {
  args: {
    role: "assistant",
    status: "streaming",
    content: "",
  },
};

export const ErrorWithRetry: Story = {
  args: {
    role: "assistant",
    status: "error",
    errorMessage: "模型响应超时（LLM_TIMEOUT）",
    onRetry: () => console.log("retry"),
  },
};
