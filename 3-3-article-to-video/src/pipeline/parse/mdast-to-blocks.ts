import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Root, PhrasingContent } from "mdast";

/**
 * step1 解析产物：把 Markdown 拍平成有序的结构化 block 序列，供步骤 2 LLM 改写。
 * 这是确定性转换，不做任何语义判断（场景类型由 LLM 在步骤 2/3 决定）。
 */

export type ParsedBlock =
  | { index: number; type: "heading"; depth: number; text: string }
  | { index: number; type: "paragraph"; text: string }
  | { index: number; type: "code"; lang: string; value: string }
  | { index: number; type: "image"; url: string; alt: string }
  | { index: number; type: "list"; ordered: boolean; items: string[] }
  | { index: number; type: "blockquote"; text: string }
  | { index: number; type: "table"; header: string[]; rows: string[][] };

export interface ParsedDoc {
  /** 第一个 H1 文本，作为视频标题/jobId 来源 */
  title: string;
  blocks: ParsedBlock[];
}

/**
 * 解析 Markdown → ParsedDoc。
 *
 * 内容处理规则（requirements.md §内容处理规则）：
 * - 行内链接：`mdastToString` 只取锚文本、自动去 URL；
 * - 图片 `![]()`：原样保留 url（绝对化留到渲染期 step5/6），从所在段落中析出为独立 image block；
 * - 表格 / 嵌套列表：保留结构，复杂度由下游 LLM 降级为要点；
 * - 数学公式（LaTeX）：MVP 不特殊处理，作为普通文本随段落带过。
 */
export function parseMarkdown(md: string): ParsedDoc {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md) as Root;

  const blocks: ParsedBlock[] = [];
  let title = "";
  let index = 0;
  const next = () => index++;

  for (const node of tree.children) {
    switch (node.type) {
      case "heading": {
        const text = mdastToString(node);
        if (node.depth === 1 && !title) title = text;
        blocks.push({ index: next(), type: "heading", depth: node.depth, text });
        break;
      }
      case "paragraph": {
        // 图片在 mdast 里是段落的行内子节点，需从文本中析出为独立 image block
        const images = node.children.filter((c) => c.type === "image");
        const textChildren = node.children.filter(
          (c) => c.type !== "image",
        ) as PhrasingContent[];
        const text = mdastToString({ type: "paragraph", children: textChildren }).trim();
        if (text) blocks.push({ index: next(), type: "paragraph", text });
        for (const img of images) {
          blocks.push({
            index: next(),
            type: "image",
            url: img.url,
            alt: img.alt ?? "",
          });
        }
        break;
      }
      case "code":
        blocks.push({
          index: next(),
          type: "code",
          lang: node.lang ?? "",
          value: node.value,
        });
        break;
      case "list":
        blocks.push({
          index: next(),
          type: "list",
          ordered: node.ordered ?? false,
          items: node.children.map((li) => mdastToString(li).trim()),
        });
        break;
      case "blockquote":
        blocks.push({ index: next(), type: "blockquote", text: mdastToString(node) });
        break;
      case "table": {
        const [head, ...body] = node.children;
        const header = head ? head.children.map((c) => mdastToString(c).trim()) : [];
        const rows = body.map((r) => r.children.map((c) => mdastToString(c).trim()));
        blocks.push({ index: next(), type: "table", header, rows });
        break;
      }
      default:
        // thematicBreak / html / 其它块级节点：MVP 跳过
        break;
    }
  }

  return { title, blocks };
}
