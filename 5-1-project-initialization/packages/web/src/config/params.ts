/**
 * 集中管理的可调参数(CLAUDE.md 三、可调参数;architecture-design.md §3)。
 *
 * 分块策略是经验默认值、非最优解,待建立评测样例后回调。其中 CHUNK_SIZE /
 * CHUNK_OVERLAP 的改动需全量重新解析 + embedding + 重建索引,须在有数据入库
 * 前定稿。改这里的常量即改全局行为,不要在业务代码里散落硬编码同类阈值。
 */
export const PARAMS = {
  /** 分块字符数。改动需全量重建。 */
  CHUNK_SIZE: 500,
  /** 块间重叠字符数。改动需全量重建。 */
  CHUNK_OVERLAP: 50,
  /** 扫描件判定阈值:解析后累计字符数低于此值判为扫描件,拦截不入库。 */
  SCAN_TEXT_THRESHOLD: 20,
  /** 向量检索返回块数。 */
  RETRIEVAL_TOP_K: 5,
  /** 低于此相似度判为「未命中文档」,回答标注为常识推测(grounded=false)。 */
  GROUNDED_SIMILARITY_THRESHOLD: 0.7,
  /** 进程内会话保留的最近对话轮数。 */
  CONTEXT_WINDOW_ROUNDS: 6,
  /** 会话内存空闲回收时限(毫秒),30 分钟;靠请求时惰性剔除,不起后台定时器。 */
  SESSION_TTL_MS: 1_800_000,
} as const;

export type Params = typeof PARAMS;
