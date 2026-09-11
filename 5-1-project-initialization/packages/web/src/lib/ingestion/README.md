# `lib/ingestion/` — 文档入库

对应 `architecture-design.md:406`(决策 2/3/9/10、时序图 1)、CLAUDE.md 模块边界 `lib/ingestion`。

## 放什么

- `index.ts` — 解析、扫描件阈值判定、pg-boss worker 的实现。
- 解析:PDF 用 `pdf-parse`、`.docx` 用 `mammoth`、TXT 用 Node `fs`,**逐格式独立 try/catch**,精确定位失败格式。
- pg-boss worker:随应用 `boss.start()` 启动,消费入库任务(领取 → processing → 解析 → 分块 → embedding → 写 doc_chunks → ready)。

## 红线

- **扫描件显式判定**:纯文本库对扫描件静默返回空串、不抛异常;累计字符数 < `SCAN_TEXT_THRESHOLD` 判为扫描件,置 `failed` + `error_reason`,不入库空内容。本期不引入 OCR。
- pg-boss 载荷只带**文件路径引用**,不塞字节本体;worker 读路径解析入库后删临时文件。
- 文件暂存服务端本地临时目录,不进对象存储(与「不引入新服务」一致)。
