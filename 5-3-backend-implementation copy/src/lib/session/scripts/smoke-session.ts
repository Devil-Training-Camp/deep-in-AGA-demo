import {
  getRecentContext,
  getConversationId,
  bindConversationId,
  appendRound,
} from "../index.ts";
import { CONTEXT_WINDOW_ROUNDS, SESSION_TTL_MS } from "../../../config/params.ts";

/**
 * lib/session 进程内内存纯逻辑冒烟(不碰 DB/API)。
 *   node --experimental-strip-types src/lib/session/scripts/smoke-session.ts
 *
 * 验证:①最近 N 轮窗口裁剪;②TTL 惰性回收;③conversationId 绑定/复用;
 *       ④新会话取上下文为空;⑤时间戳可注入(便于确定性测试)。
 */

let failed = false;
const check = (ok: boolean, msg: string): void => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed = true;
};

// ── 1. 新会话上下文为空 ────────────────────────────────
{
  const ctx = getRecentContext("sess-new", 1000);
  check(ctx.length === 0, "全新会话取上下文为空");
  check(getConversationId("sess-new", 1000) === null, "全新会话 conversationId 为 null");
}

// ── 2. 追加一轮后能取回(user+assistant 两条,顺序正确)──
{
  const sid = "sess-a";
  appendRound(sid, "第一问", "第一答", 2000);
  const ctx = getRecentContext(sid, 2000);
  check(ctx.length === 2, "追加一轮 → 2 条消息");
  check(ctx[0].role === "user" && ctx[0].content === "第一问", "第 0 条是 user 问");
  check(ctx[1].role === "assistant" && ctx[1].content === "第一答", "第 1 条是 assistant 答");
}

// ── 3. 窗口裁剪:超过 N 轮只留最近 N 轮 ─────────────────
{
  const sid = "sess-window";
  const rounds = CONTEXT_WINDOW_ROUNDS + 3; // 故意超出
  for (let i = 0; i < rounds; i++) {
    appendRound(sid, `问${i}`, `答${i}`, 3000);
  }
  const ctx = getRecentContext(sid, 3000);
  check(ctx.length === CONTEXT_WINDOW_ROUNDS * 2, `只保留最近 ${CONTEXT_WINDOW_ROUNDS} 轮(${CONTEXT_WINDOW_ROUNDS * 2} 条)`);
  // 最近一轮应是问/答 (rounds-1)
  const last = ctx[ctx.length - 1];
  check(last.content === `答${rounds - 1}`, "窗口尾部是最近一轮的答");
  const first = ctx[0];
  check(first.content === `问${rounds - CONTEXT_WINDOW_ROUNDS}`, "窗口头部是第 (总-N) 轮的问(更早的被裁掉)");
}

// ── 4. conversationId 绑定 / 复用 ──────────────────────
{
  const sid = "sess-bind";
  appendRound(sid, "q", "a", 4000);
  check(getConversationId(sid, 4000) === null, "绑定前 conversationId 仍为 null");
  bindConversationId(sid, 123, 4000);
  check(getConversationId(sid, 4000) === 123, "绑定后能取回 conversationId=123");
}

// ── 5. TTL 惰性回收:超过 SESSION_TTL_MS 未访问 → 清空 ──
{
  const sid = "sess-ttl";
  const t0 = 10_000;
  appendRound(sid, "q", "a", t0);
  bindConversationId(sid, 999, t0);
  check(getRecentContext(sid, t0).length === 2, "TTL 内仍在");
  // 跨过 TTL 再访问(任何 getter 触发惰性回收)
  const tExpired = t0 + SESSION_TTL_MS + 1;
  check(getRecentContext(sid, tExpired).length === 0, "超过 TTL 后上下文被回收(空)");
  check(getConversationId(sid, tExpired) === null, "超过 TTL 后 conversationId 也没了");
}

console.log(failed ? "\n结果: ✗ 有失败项" : "\n结果: ✓ 全部通过");
process.exit(failed ? 1 : 0);
