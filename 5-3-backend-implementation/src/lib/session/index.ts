import type { LLMMessage } from "../llm/index.ts";
import { CONTEXT_WINDOW_ROUNDS, SESSION_TTL_MS } from "../../config/params.ts";

/**
 * 进程内会话内存 —— 只服务「多轮对话上下文」,按 sessionId 索引最近 N 轮。
 *
 * 红线(CLAUDE.md):
 *   - **绝不读 messages 历史表**。"历史不作为上下文"靠这条读路径分离实现,不靠表字段。
 *     多轮上下文只来自这里的进程内内存;messages 表是纯审计/展示,两条路互不交叉。
 *   - 只保留最近 CONTEXT_WINDOW_ROUNDS 轮(一轮 = 一问一答)。更早的自然淘汰。
 *   - TTL 惰性回收:请求时剔除过期会话,不起后台定时器(SESSION_TTL_MS)。
 *   - 单长驻 Node 进程,故用模块级 Map 即可;不引 Redis / 任何新服务。
 *
 * 关联 conversationId:sessionId 是「易失的上下文键」,conversationId 是「持久的历史键」
 * (见 architecture-design.md §四.4)。这里顺带记住某 sessionId 当前活跃的 conversationId,
 * 供 route 复用同一持久化会话,但**内存里存的对话内容不等于 DB 历史**。
 */

interface SessionEntry {
  /** 最近若干轮的对话消息(user/assistant 交替,最近在后)。system 不进这里。 */
  messages: LLMMessage[];
  /** 该 session 当前活跃的持久化会话行 ID(首轮由 route 建库后回填)。 */
  conversationId: number | null;
  /** 最近一次访问时间戳(ms);用于惰性 TTL 回收。 */
  lastAccess: number;
}

// 模块级单例:单进程内所有请求共享。进程重启即清空(与 sessionId 语义一致)。
const store = new Map<string, SessionEntry>();

/** 请求时惰性剔除过期会话(不起定时器)。every getter/setter 前调一次。 */
function evictExpired(now: number): void {
  for (const [sid, entry] of store) {
    if (now - entry.lastAccess > SESSION_TTL_MS) {
      store.delete(sid);
    }
  }
}

function touch(entry: SessionEntry, now: number): void {
  entry.lastAccess = now;
}

/**
 * 取某 session 的最近 N 轮上下文消息(浅拷贝,调用方不应改动内部数组)。
 * 不存在或已过期 → 返回空数组(全新会话)。
 */
export function getRecentContext(sessionId: string, now = Date.now()): LLMMessage[] {
  evictExpired(now);
  const entry = store.get(sessionId);
  if (!entry) return [];
  touch(entry, now);
  return [...entry.messages];
}

/** 取某 session 当前活跃的持久化 conversationId(首轮尚未建库时为 null)。 */
export function getConversationId(sessionId: string, now = Date.now()): number | null {
  evictExpired(now);
  const entry = store.get(sessionId);
  if (!entry) return null;
  touch(entry, now);
  return entry.conversationId;
}

/** 首轮建库后,把 conversationId 绑定到该 session,供后续追问复用。 */
export function bindConversationId(sessionId: string, conversationId: number, now = Date.now()): void {
  const entry = ensureEntry(sessionId, now);
  entry.conversationId = conversationId;
}

/**
 * 追加完整的一轮(user 问 + assistant 答)到会话窗口,并裁剪到最近 N 轮。
 *
 * 只在**回答完整生成后**调用(与"残答不落库"一致:残答既不写 DB 也不进上下文窗口,
 * 否则半截答案会污染后续追问的上下文)。
 */
export function appendRound(
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
  now = Date.now(),
): void {
  const entry = ensureEntry(sessionId, now);
  entry.messages.push({ role: "user", content: userMessage });
  entry.messages.push({ role: "assistant", content: assistantMessage });
  trimToWindow(entry);
}

function ensureEntry(sessionId: string, now: number): SessionEntry {
  evictExpired(now);
  let entry = store.get(sessionId);
  if (!entry) {
    entry = { messages: [], conversationId: null, lastAccess: now };
    store.set(sessionId, entry);
  }
  touch(entry, now);
  return entry;
}

/** 只保留最近 CONTEXT_WINDOW_ROUNDS 轮 = 最近 N*2 条消息(一问一答为一轮)。 */
function trimToWindow(entry: SessionEntry): void {
  const maxMessages = CONTEXT_WINDOW_ROUNDS * 2;
  if (entry.messages.length > maxMessages) {
    entry.messages = entry.messages.slice(-maxMessages);
  }
}
