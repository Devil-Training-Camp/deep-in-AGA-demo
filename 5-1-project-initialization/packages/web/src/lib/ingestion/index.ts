// 解析、扫描件阈值判定、pg-boss worker(CLAUDE.md 模块边界)。逐格式独立 try/catch。
// PDF 用 pdf-parse、.docx 用 mammoth、TXT 用 Node fs;纯文本库对扫描件静默返回空串,
// 必须按 SCAN_TEXT_THRESHOLD 显式判定拦截,不入库空内容。本期不引入 OCR。
// pg-boss 载荷只带文件路径引用,不带字节本体;worker 解析入库后删临时文件。
export {};
