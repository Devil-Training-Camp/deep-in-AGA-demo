import Button from './components/Button'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">上下文工程演示</h1>
      <p className="text-gray-500 text-sm">当前只有一个 Button 组件，演示时用 prompt 新增组件</p>

      <div className="flex gap-4">
        <Button label="主要操作" variant="primary" onClick={() => alert('primary')} />
        <Button label="危险操作" variant="danger" onClick={() => alert('danger')} />
        <Button label="成功操作" variant="success" onClick={() => alert('success')} />
      </div>
    </div>
  )
}
