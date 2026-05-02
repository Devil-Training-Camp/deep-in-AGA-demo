import React, { useState } from "react";
import { Button } from "./components/Button";
import { Badge } from "./components/Badge";
import { Card } from "./components/Card";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="w-28 text-sm text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center flex-wrap gap-3">{children}</div>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(false);

  function handleLoad() {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">Component Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            3 个基础组件 · MCP Demo 配套组件库
          </p>
        </div>

        {/* Button */}
        <Section title="Button">
          <Row label="variant">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
          </Row>
          <Row label="size">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row label="state">
            <Button disabled>Disabled</Button>
            <Button loading={loading} onClick={handleLoad}>
              {loading ? "加载中" : "点击加载"}
            </Button>
          </Row>
        </Section>

        {/* Badge */}
        <Section title="Badge">
          <Row label="variant">
            <Badge>Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
          </Row>
          <Row label="with dot">
            <Badge variant="success" dot>在线</Badge>
            <Badge variant="warning" dot>待处理</Badge>
            <Badge variant="danger" dot>已下线</Badge>
          </Row>
          <Row label="size">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
          </Row>
        </Section>

        {/* Card */}
        <Section title="Card">
          <div className="grid grid-cols-2 gap-4">
            <Card
              title="Default Card"
              description="标准边框，适用于列表和内容聚合场景。"
              footer="2026-05-01"
            />
            <Card
              variant="elevated"
              title="Elevated Card"
              description="阴影浮起，适合强调或推荐内容。"
              actions={<Button size="sm">查看详情</Button>}
            />
            <Card
              title="带状态标签"
              description="使用 children 插槽组合 Badge 展示多维度信息。"
            >
              <div className="flex gap-2">
                <Badge variant="success" dot>已发布</Badge>
                <Badge variant="info">React</Badge>
              </div>
            </Card>
            <Card
              variant="bordered"
              title="可点击整卡"
              description="整卡响应点击，hover 时阴影加深，适合跳转场景。"
              onClick={() => {}}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
