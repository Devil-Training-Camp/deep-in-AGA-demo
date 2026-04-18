import { z } from "zod";

// ── 节点 / 边 ────────────────────────────────────────────────────────────────

const NodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  sublabel: z.string().optional(), // 副标题/说明
  color: z.string().optional(),    // 主色，如 "#6366f1"
});

const EdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  dashed: z.boolean().optional(),
});

// ── 5 种图形类型 ──────────────────────────────────────────────────────────────

/** 时序图：多个参与者之间按顺序的消息交换 */
const SequenceDiagramSchema = z.object({
  type: z.literal("sequence"),
  actors: z.array(z.object({ id: z.string(), label: z.string() })),
  messages: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
    dashed: z.boolean().optional(), // 虚线 = 响应
  })),
});

/** 分层架构图：从上到下多层，每层有若干节点 */
const LayerDiagramSchema = z.object({
  type: z.literal("layer"),
  layers: z.array(z.object({
    label: z.string(),         // 层名，如 "Application Layer"
    color: z.string().optional(),
    nodes: z.array(z.object({ label: z.string(), sublabel: z.string().optional() })),
  })),
});

/** 流程图：节点 + 有向边 */
const FlowDiagramSchema = z.object({
  type: z.literal("flow"),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

/** 左右对比图：两列，每列若干条目 */
const CompareDiagramSchema = z.object({
  type: z.literal("compare"),
  left: z.object({ label: z.string(), items: z.array(z.string()), color: z.string().optional() }),
  right: z.object({ label: z.string(), items: z.array(z.string()), color: z.string().optional() }),
});

/** 概念扩散图：中心概念 + 周围子概念 */
const MindmapDiagramSchema = z.object({
  type: z.literal("mindmap"),
  center: z.string(),
  branches: z.array(z.object({
    label: z.string(),
    items: z.array(z.string()).optional(), // 叶子条目（可选）
  })),
});

export const VisualSpecSchema = z.discriminatedUnion("type", [
  SequenceDiagramSchema,
  LayerDiagramSchema,
  FlowDiagramSchema,
  CompareDiagramSchema,
  MindmapDiagramSchema,
]);

export type VisualSpec = z.infer<typeof VisualSpecSchema>;
export type SequenceDiagram = z.infer<typeof SequenceDiagramSchema>;
export type LayerDiagram = z.infer<typeof LayerDiagramSchema>;
export type FlowDiagram = z.infer<typeof FlowDiagramSchema>;
export type CompareDiagram = z.infer<typeof CompareDiagramSchema>;
export type MindmapDiagram = z.infer<typeof MindmapDiagramSchema>;
