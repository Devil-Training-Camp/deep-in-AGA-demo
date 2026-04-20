import { useState } from 'react';
import { Button } from './components/Button';

export function App() {
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Button 组件演示</h1>
      <p className="mb-8 text-gray-500">
        这是 Skill 演示用的 Button 组件，用 <code>/create-stories</code> 为它生成 Storybook stories。
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Variant</h2>
        <div className="flex gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Size</h2>
        <div className="flex items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">States</h2>
        <div className="flex gap-3">
          <Button disabled>Disabled</Button>
          <Button loading={loading} onClick={handleLoadingDemo}>
            {loading ? 'Loading...' : 'Click to Load'}
          </Button>
        </div>
      </section>
    </div>
  );
}
