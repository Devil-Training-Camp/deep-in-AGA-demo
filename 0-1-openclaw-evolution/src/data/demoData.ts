/**
 * Pre-generated demo dataset simulating vercel/ai's growth trajectory.
 * Used as fallback when GitHub API is unavailable (rate limit, offline, etc.)
 *
 * Based on the actual vercel/ai repo structure:
 * - Started late 2022 as useChat/useCompletion hooks
 * - Rapidly grew into a multi-provider AI SDK monorepo
 * - Packages: ai (core), @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/react, etc.
 */

import type { RepoData } from '../types';

const START = new Date('2022-10-20T10:00:00Z');

function daysAfterStart(days: number, hours = 0): string {
  return new Date(START.getTime() + (days * 24 + hours) * 3600_000).toISOString();
}

const CONTRIBUTORS = [
  { login: 'lgrammel',    avatar: undefined },
  { login: 'shuding',     avatar: undefined },
  { login: 'jaredpalmer', avatar: undefined },
  { login: 'nicoalbanese', avatar: undefined },
  { login: 'MaxLeiter',   avatar: undefined },
  { login: 'mxkaske',     avatar: undefined },
  { login: 'rickhanlonii', avatar: undefined },
];

function pick<T>(arr: T[], idx: number): T { return arr[idx % arr.length]; }

// ─── Commits ──────────────────────────────────────────────────────────────────
const RAW_COMMITS: Array<{ days: number; author: number; msg: string }> = [
  { days: 0,   author: 0, msg: 'chore: initial commit' },
  { days: 0,   author: 0, msg: 'feat: useChat and useCompletion hooks' },
  { days: 1,   author: 0, msg: 'feat: streaming text response' },
  { days: 2,   author: 1, msg: 'feat: OpenAI provider' },
  { days: 3,   author: 0, msg: 'fix: handle streaming edge cases' },
  { days: 5,   author: 2, msg: 'feat: add React integration' },
  { days: 6,   author: 0, msg: 'feat: Anthropic Claude provider' },
  { days: 7,   author: 1, msg: 'docs: add README and examples' },
  { days: 9,   author: 0, msg: 'feat: tool calling support' },
  { days: 11,  author: 3, msg: 'feat: Vue composables' },
  { days: 13,  author: 0, msg: 'refactor: unified provider interface' },
  { days: 14,  author: 1, msg: 'feat: Google Gemini provider' },
  { days: 16,  author: 4, msg: 'feat: Next.js example app' },
  { days: 18,  author: 0, msg: 'feat: structured object generation' },
  { days: 20,  author: 2, msg: 'feat: Mistral AI provider' },
  { days: 22,  author: 0, msg: 'feat: stream data protocol v2' },
  { days: 24,  author: 3, msg: 'feat: Svelte integration' },
  { days: 26,  author: 5, msg: 'feat: Cohere provider' },
  { days: 28,  author: 0, msg: 'perf: reduce bundle size' },
  { days: 30,  author: 1, msg: 'feat: multi-step tool calling' },
  { days: 32,  author: 4, msg: 'feat: Nuxt example' },
  { days: 34,  author: 0, msg: 'feat: AI SDK Core: generateText' },
  { days: 36,  author: 2, msg: 'feat: Azure OpenAI provider' },
  { days: 38,  author: 6, msg: 'feat: Amazon Bedrock provider' },
  { days: 40,  author: 0, msg: 'feat: image generation support' },
  { days: 42,  author: 3, msg: 'feat: SolidJS integration' },
  { days: 44,  author: 1, msg: 'feat: embeddings API' },
  { days: 46,  author: 0, msg: 'feat: provider registry' },
  { days: 48,  author: 5, msg: 'feat: Perplexity provider' },
  { days: 50,  author: 0, msg: 'refactor: migrate to new AI SDK structure' },
  { days: 52,  author: 4, msg: 'feat: SvelteKit example' },
  { days: 54,  author: 2, msg: 'feat: Groq provider' },
  { days: 56,  author: 0, msg: 'feat: generateObject with schema validation' },
  { days: 58,  author: 3, msg: 'feat: xAI Grok provider' },
  { days: 60,  author: 6, msg: 'feat: Together AI provider' },
  { days: 63,  author: 0, msg: 'feat: AI SDK RSC (Server Components)' },
  { days: 65,  author: 1, msg: 'fix: race condition in streaming' },
  { days: 68,  author: 4, msg: 'feat: Remix example' },
  { days: 70,  author: 0, msg: 'feat: agentic workflows / pipelines' },
  { days: 73,  author: 2, msg: 'feat: Fireworks AI provider' },
  { days: 75,  author: 5, msg: 'feat: DeepSeek provider' },
  { days: 78,  author: 0, msg: 'feat: agent memory and state' },
  { days: 80,  author: 3, msg: 'feat: Express.js examples' },
  { days: 83,  author: 6, msg: 'feat: NestJS provider integration' },
  { days: 85,  author: 0, msg: 'perf: streaming pipeline optimization' },
  { days: 88,  author: 1, msg: 'feat: Hono framework examples' },
  { days: 91,  author: 4, msg: 'feat: multi-agent orchestration' },
  { days: 94,  author: 0, msg: 'feat: MCP (Model Context Protocol) support' },
  { days: 97,  author: 2, msg: 'feat: reasoning / thinking models support' },
  { days: 100, author: 0, msg: 'feat: computer use / tools integration' },
  { days: 103, author: 5, msg: 'feat: LangChain adapter' },
  { days: 106, author: 3, msg: 'feat: Vercel AI Gateway provider' },
  { days: 109, author: 0, msg: 'refactor: agent loop improvements' },
  { days: 112, author: 6, msg: 'feat: Nova provider' },
  { days: 115, author: 1, msg: 'docs: add comprehensive API reference' },
  { days: 118, author: 0, msg: 'feat: AI SDK 4.0 release prep' },
  { days: 121, author: 4, msg: 'feat: tracing and observability' },
  { days: 124, author: 2, msg: 'feat: Claude skills integration' },
  { days: 127, author: 0, msg: 'chore: v4.0.0 stable 🎉' },
  { days: 130, author: 3, msg: 'fix: patch security vulnerabilities' },
];

export const DEMO_COMMITS = RAW_COMMITS.map((c, i) => ({
  sha: `demo${String(i).padStart(4, '0')}`,
  date: daysAfterStart(c.days, i % 8),
  author: pick(CONTRIBUTORS, c.author).login,
  authorAvatar: pick(CONTRIBUTORS, c.author).avatar,
  message: c.msg,
}));

// ─── File snapshots ────────────────────────────────────────────────────────────
type F = { path: string; size: number };

const SNAP_0: F[] = [
  { path: 'README.md', size: 5200 },
  { path: 'package.json', size: 1400 },
  { path: 'tsconfig.json', size: 800 },
  { path: 'packages/ai/src/index.ts', size: 1800 },
  { path: 'packages/ai/src/types.ts', size: 2400 },
];

const SNAP_4: F[] = [
  ...SNAP_0,
  { path: 'packages/ai/src/core/generate-text.ts', size: 7200 },
  { path: 'packages/ai/src/core/stream-text.ts', size: 8100 },
  { path: 'packages/ai/src/react/use-chat.ts', size: 9600 },
  { path: 'packages/ai/src/react/use-completion.ts', size: 6800 },
  { path: 'packages/openai/src/index.ts', size: 4200 },
  { path: 'packages/openai/src/openai-provider.ts', size: 11400 },
  { path: 'packages/openai/src/openai-chat-language-model.ts', size: 14200 },
];

const SNAP_8: F[] = [
  ...SNAP_4,
  { path: 'packages/anthropic/src/index.ts', size: 3800 },
  { path: 'packages/anthropic/src/anthropic-provider.ts', size: 10600 },
  { path: 'packages/anthropic/src/anthropic-messages-language-model.ts', size: 13800 },
  { path: 'packages/ai/src/core/tool.ts', size: 5600 },
  { path: 'packages/ai/src/core/generate-object.ts', size: 8900 },
  { path: 'packages/react/src/index.ts', size: 2100 },
  { path: 'packages/react/src/use-chat.tsx', size: 11200 },
  { path: 'docs/getting-started.md', size: 8400 },
];

const SNAP_12: F[] = [
  ...SNAP_8,
  { path: 'packages/google/src/index.ts', size: 3600 },
  { path: 'packages/google/src/google-provider.ts', size: 9800 },
  { path: 'packages/google/src/google-generative-ai-language-model.ts', size: 12600 },
  { path: 'packages/vue/src/index.ts', size: 2400 },
  { path: 'packages/vue/src/use-chat.ts', size: 9800 },
  { path: 'examples/next-openai/app/page.tsx', size: 4200 },
  { path: 'examples/next-openai/app/api/chat/route.ts', size: 3100 },
  { path: 'packages/ai/src/core/embed.ts', size: 5400 },
];

const SNAP_16: F[] = [
  ...SNAP_12,
  { path: 'packages/mistral/src/index.ts', size: 3200 },
  { path: 'packages/mistral/src/mistral-provider.ts', size: 9200 },
  { path: 'packages/mistral/src/mistral-chat-language-model.ts', size: 11600 },
  { path: 'packages/svelte/src/index.ts', size: 2200 },
  { path: 'packages/svelte/src/use-chat.svelte.ts', size: 9400 },
  { path: 'packages/cohere/src/index.ts', size: 3100 },
  { path: 'packages/cohere/src/cohere-provider.ts', size: 8800 },
  { path: 'packages/ai/src/util/validate-types.ts', size: 3600 },
  { path: 'packages/ai/src/util/parse-partial-json.ts', size: 4200 },
];

const SNAP_20: F[] = [
  ...SNAP_16,
  { path: 'packages/azure/src/index.ts', size: 3400 },
  { path: 'packages/azure/src/azure-openai-provider.ts', size: 9600 },
  { path: 'packages/amazon-bedrock/src/index.ts', size: 3600 },
  { path: 'packages/amazon-bedrock/src/bedrock-provider.ts', size: 10200 },
  { path: 'packages/amazon-bedrock/src/bedrock-chat-language-model.ts', size: 12800 },
  { path: 'examples/next-anthropic/app/page.tsx', size: 4400 },
  { path: 'examples/next-anthropic/app/api/chat/route.ts', size: 3200 },
  { path: 'packages/ai/src/core/generate-image.ts', size: 6200 },
  { path: 'packages/solid/src/index.ts', size: 2300 },
  { path: 'packages/solid/src/use-chat.ts', size: 9200 },
];

const SNAP_24: F[] = [
  ...SNAP_20,
  { path: 'packages/ai/src/core/registry.ts', size: 7400 },
  { path: 'packages/ai/src/middleware/logging.ts', size: 4600 },
  { path: 'packages/ai/src/middleware/tracing.ts', size: 5800 },
  { path: 'packages/perplexity/src/index.ts', size: 3000 },
  { path: 'packages/perplexity/src/perplexity-provider.ts', size: 8600 },
  { path: 'examples/nuxt-openai/server/api/chat.post.ts', size: 2800 },
  { path: 'examples/nuxt-openai/pages/index.vue', size: 4100 },
  { path: 'packages/groq/src/index.ts', size: 2900 },
  { path: 'packages/groq/src/groq-provider.ts', size: 8200 },
  { path: 'packages/ai/src/core/stream-object.ts', size: 9800 },
];

const SNAP_28: F[] = [
  ...SNAP_24,
  { path: 'packages/xai/src/index.ts', size: 2800 },
  { path: 'packages/xai/src/xai-provider.ts', size: 8100 },
  { path: 'packages/togetherai/src/index.ts', size: 2700 },
  { path: 'packages/togetherai/src/togetherai-provider.ts', size: 7900 },
  { path: 'packages/ai/src/rsc/index.ts', size: 3600 },
  { path: 'packages/ai/src/rsc/streamable-value.ts', size: 7200 },
  { path: 'packages/ai/src/rsc/create-streamable-ui.tsx', size: 8900 },
  { path: 'examples/next-openai-rsc/app/page.tsx', size: 5100 },
  { path: 'examples/next-openai-rsc/app/actions.ts', size: 4600 },
  { path: 'packages/ai/src/agent/run-tools.ts', size: 11200 },
];

const SNAP_32: F[] = [
  ...SNAP_28,
  { path: 'packages/fireworks/src/index.ts', size: 2600 },
  { path: 'packages/fireworks/src/fireworks-provider.ts', size: 7800 },
  { path: 'packages/deepseek/src/index.ts', size: 2500 },
  { path: 'packages/deepseek/src/deepseek-provider.ts', size: 7600 },
  { path: 'packages/ai/src/agent/memory.ts', size: 8600 },
  { path: 'packages/ai/src/agent/state.ts', size: 6400 },
  { path: 'examples/express/src/server.ts', size: 3800 },
  { path: 'examples/hono/src/index.ts', size: 3400 },
  { path: 'packages/nestjs/src/index.ts', size: 2800 },
  { path: 'packages/nestjs/src/ai-service.ts', size: 7200 },
];

const SNAP_36: F[] = [
  ...SNAP_32,
  { path: 'packages/ai/src/agent/orchestrate.ts', size: 14200 },
  { path: 'packages/ai/src/agent/supervisor.ts', size: 11400 },
  { path: 'packages/ai/src/agent/worker.ts', size: 9800 },
  { path: 'packages/ai/src/mcp/client.ts', size: 12600 },
  { path: 'packages/ai/src/mcp/server.ts', size: 10200 },
  { path: 'packages/ai/src/mcp/transport.ts', size: 7800 },
  { path: 'examples/remix/app/routes/_index.tsx', size: 4200 },
  { path: 'examples/svelte-openai/src/routes/+page.svelte', size: 3800 },
  { path: 'packages/ai/src/util/reasoning.ts', size: 6200 },
];

const SNAP_40: F[] = [
  ...SNAP_36,
  { path: 'packages/ai/src/core/computer-use.ts', size: 8900 },
  { path: 'packages/ai/src/core/file-search.ts', size: 7600 },
  { path: 'packages/langchain/src/index.ts', size: 3600 },
  { path: 'packages/langchain/src/langchain-adapter.ts', size: 9400 },
  { path: 'packages/gateway/src/index.ts', size: 3200 },
  { path: 'packages/gateway/src/gateway-provider.ts', size: 10800 },
  { path: 'packages/ai/src/telemetry/trace.ts', size: 6800 },
  { path: 'packages/ai/src/telemetry/span.ts', size: 5200 },
  { path: 'packages/ai/src/telemetry/metrics.ts', size: 4600 },
  { path: 'examples/next-openai/app/api/use-object/route.ts', size: 2900 },
];

const SNAP_44: F[] = [
  ...SNAP_40,
  { path: 'packages/nova/src/index.ts', size: 2400 },
  { path: 'packages/nova/src/nova-provider.ts', size: 7400 },
  { path: 'packages/ai/src/agent/loop.ts', size: 16400 },
  { path: 'packages/ai/src/agent/tools.ts', size: 12800 },
  { path: 'packages/ai/src/agent/interrupt.ts', size: 6600 },
  { path: 'docs/ai-sdk-core.md', size: 24600 },
  { path: 'docs/ai-sdk-ui.md', size: 18400 },
  { path: 'docs/ai-sdk-rsc.md', size: 14200 },
  { path: 'packages/ai/CHANGELOG.md', size: 32000 },
];

const SNAP_48: F[] = [
  ...SNAP_44,
  { path: 'packages/ai/src/core/trace-text.ts', size: 7800 },
  { path: 'packages/ai/src/core/trace-object.ts', size: 6400 },
  { path: 'skills/code-review.md', size: 4200 },
  { path: 'skills/debug-typescript.md', size: 3800 },
  { path: 'skills/write-tests.md', size: 4600 },
  { path: 'tools/benchmark/src/index.ts', size: 6800 },
  { path: 'tools/benchmark/src/run.ts', size: 5400 },
  { path: 'tools/codegen/src/index.ts', size: 8200 },
  { path: 'examples/next-anthropic/app/api/use-object/route.ts', size: 2800 },
  { path: 'examples/next-google/app/page.tsx', size: 4400 },
];

const SNAP_52: F[] = [
  ...SNAP_48,
  { path: 'packages/anthropic/src/anthropic-computer-use.ts', size: 11200 },
  { path: 'packages/anthropic/src/anthropic-thinking.ts', size: 8600 },
  { path: 'packages/openai/src/openai-responses-language-model.ts', size: 14800 },
  { path: 'packages/openai/src/openai-image-model.ts', size: 9200 },
  { path: 'packages/ai/src/core/transcribe.ts', size: 7400 },
  { path: 'packages/ai/src/core/speech.ts', size: 5800 },
  { path: 'examples/next-openai/app/api/transcribe/route.ts', size: 2600 },
  { path: 'packages/ai/src/util/retry.ts', size: 4200 },
];

const SNAP_56: F[] = [
  ...SNAP_52,
  { path: 'packages/ai/src/agent/v2/agent.ts', size: 18600 },
  { path: 'packages/ai/src/agent/v2/executor.ts', size: 14200 },
  { path: 'packages/ai/src/agent/v2/planner.ts', size: 12400 },
  { path: 'packages/ai/src/agent/v2/observer.ts', size: 8800 },
  { path: 'packages/claude/src/index.ts', size: 3200 },
  { path: 'packages/claude/src/claude-skills-provider.ts', size: 11600 },
  { path: 'packages/claude/src/claude-agent-integration.ts', size: 9400 },
  { path: 'examples/agentic/src/index.ts', size: 6400 },
];

const SNAP_59: F[] = [
  ...SNAP_56,
  { path: 'packages/ai/src/security/sanitize.ts', size: 4800 },
  { path: 'packages/ai/src/security/validate.ts', size: 5600 },
  { path: 'docs/security.md', size: 8200 },
  { path: 'CHANGELOG.md', size: 41600 },
];

// ─── Assemble RepoData ─────────────────────────────────────────────────────────

const SNAPSHOT_COMMITS = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 59];
const SNAPSHOT_DATA = [
  SNAP_0, SNAP_4, SNAP_8, SNAP_12, SNAP_16, SNAP_20, SNAP_24, SNAP_28,
  SNAP_32, SNAP_36, SNAP_40, SNAP_44, SNAP_48, SNAP_52, SNAP_56, SNAP_59,
];

export const DEMO_DATA: RepoData = {
  commits: DEMO_COMMITS,
  snapshots: SNAPSHOT_COMMITS.map((commitIndex, i) => ({
    commitIndex,
    sha: `tree${String(commitIndex).padStart(4, '0')}`,
    files: SNAPSHOT_DATA[i],
  })),
};
