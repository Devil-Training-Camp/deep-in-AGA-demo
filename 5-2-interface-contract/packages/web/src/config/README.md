# `config/` — 集中可调参数

对应 `architecture-design.md:408`(§集中可调参数 `:428`)、CLAUDE.md「可调参数」。

## 放什么

- `params.ts` — 全部可调参数常量(`as const`),一处定义,全项目引用。

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `CHUNK_SIZE` | 500 | 分块字符数(**改动需全量重建**) |
| `CHUNK_OVERLAP` | 50 | 块间重叠字符数 |
| `SCAN_TEXT_THRESHOLD` | 20 | 扫描件判定字符阈值 |
| `RETRIEVAL_TOP_K` | 5 | 向量检索返回块数 |
| `GROUNDED_SIMILARITY_THRESHOLD` | 0.7 | 低于此判为"未命中文档" |
| `CONTEXT_WINDOW_ROUNDS` | 6 | 进程内会话保留轮数 |
| `SESSION_TTL_MS` | 1800000 | 会话内存空闲回收阈值(30 分钟) |

## 注意

- 分块相关参数(`CHUNK_SIZE`/`CHUNK_OVERLAP`)是经验默认值、非最优解,**须在有数据入库前定稿**——改动需全量重新解析+embedding+重建索引。
- 这里只放「可调的业务参数」,不放密钥/连接串(那些走服务端环境变量)。
