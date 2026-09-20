import mammoth from "mammoth";

/**
 * 文档正文抽取 —— 输入文件字节 + MIME,输出纯文本。
 *
 * 归属:lib/ingestion(解析、扫描件阈值判定、pg-boss worker),不是 lib/rag。
 *   CLAUDE.md 模块边界:lib/rag 只管分块 / 向量检索 / query rewriting;
 *   解析在 ingestion。请求里写的 packages/web/src/lib/rag/extract.ts 与本项目布局
 *   (无 packages/,一切在 src/lib/)及模块边界都不符,故落到 src/lib/ingestion/extract.ts。
 *
 * 支持格式严格对齐架构决策 9:PDF(pdf-parse)、Word .docx(mammoth)、TXT(内置解码);
 * Markdown 作为纯文本超集顺带支持(UTF-8 直读,无新依赖、不违背任何约束)。
 * 其余一律不支持——含 Excel:决策 9 把格式锁死在 PDF/.docx/TXT,加 xlsx 属要往上游
 * 拍板的选型变更,本轮已确认不引入,故 Excel 走 UnsupportedFileTypeError。
 *
 * 逐格式独立 try/catch(决策 9):精确定位是哪种格式解析失败,满足"单份失败显示具体原因"。
 *
 * 注意:本函数只负责"把字节变成文本",不做扫描件判定。扫描件对纯文本库是**静默返回
 * 空串、不抛异常**(决策 10),所以"文本量是否低于阈值"由调用方(worker)按
 * SCAN_TEXT_THRESHOLD 判定后置 failed —— 抽取层返回空串是合法结果,不在这里报错。
 */

/** 不支持的文件类型 —— 调用方据此把文档置 failed + error_reason。 */
export class UnsupportedFileTypeError extends Error {
  // 注:不用 TS 参数属性(constructor(public ...))—— Node --experimental-strip-types
  // 是「只删类型、不转换语法」模式,不支持参数属性,会在 import 时直接 SyntaxError。
  // 本项目所有脚本/worker 都走 strip-types,故此处显式声明字段并手动赋值。
  readonly mimeType: string;
  constructor(mimeType: string) {
    super(`不支持的文件类型: ${mimeType}`);
    this.name = "UnsupportedFileTypeError";
    this.mimeType = mimeType;
  }
}

/** 某种格式解析过程本身失败(区别于"不支持") —— 保留 cause 以便定位。 */
export class ExtractionError extends Error {
  constructor(format: string, cause: unknown) {
    super(`解析 ${format} 失败: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "ExtractionError";
    this.cause = cause;
  }
}

// pdf-parse 无类型声明(也无 @types/pdf-parse)。直接引 lib 下的实现,绕开其
// index.js 在 module.parent 为空时跑调试/测试代码的历史坑;并给出最小签名。
// @ts-expect-error —— pdf-parse/lib/pdf-parse.js 无 .d.ts,此处显式声明其签名。
import pdfParse from "pdf-parse/lib/pdf-parse.js";
type PdfParse = (data: Buffer) => Promise<{ text: string }>;
const parsePdf = pdfParse as unknown as PdfParse;

// MIME → 处理分支。同义/别名 MIME 都归一到同一分支。
const PDF_MIMES = new Set(["application/pdf"]);
const DOCX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
// 纯文本族:TXT、Markdown 及常见文本 MIME。Markdown 是纯文本超集,UTF-8 直读即可。
const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

/**
 * 抽取文件正文。
 * @param buffer   文件字节
 * @param mimeType 文件 MIME(小写归一后匹配)
 * @returns 纯文本(可能为空串:扫描件等由调用方按阈值判定,不在此抛错)
 * @throws {UnsupportedFileTypeError} MIME 不在支持集
 * @throws {ExtractionError}          支持的格式但解析过程失败
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  const mime = mimeType.trim().toLowerCase();

  if (PDF_MIMES.has(mime)) {
    try {
      const { text } = await parsePdf(buffer);
      return normalize(text);
    } catch (err) {
      throw new ExtractionError("PDF", err);
    }
  }

  if (DOCX_MIMES.has(mime)) {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      return normalize(value);
    } catch (err) {
      throw new ExtractionError("Word(.docx)", err);
    }
  }

  if (TEXT_MIMES.has(mime)) {
    try {
      // TextDecoder 遇非法字节不抛(fatal 默认 false),对文本/MD 足够稳。
      return normalize(new TextDecoder("utf-8").decode(buffer));
    } catch (err) {
      throw new ExtractionError("纯文本/Markdown", err);
    }
  }

  // 其余(含 Excel application/vnd...spreadsheetml.sheet、application/vnd.ms-excel):不支持。
  throw new UnsupportedFileTypeError(mimeType);
}

/** 统一换行、去除零宽字符与首尾空白;不改动正文内容。 */
function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n") // CRLF/CR -> LF
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "") // zero-width space/joiner/BOM
    .trim();
}
