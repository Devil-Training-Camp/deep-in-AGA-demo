'use client'
import { useEffect, useState } from 'react'
import { ChatPanel } from '../components/chat-panel'
export default function Home() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [mock, setMock] = useState(true)
  useEffect(()=>{
    const enabled = new URLSearchParams(window.location.search).get('mock') !== 'off'
    setMock(enabled)
    if (!enabled) {setReady(true);return}
    import('../mocks/browser').then(({startMock})=>startMock()).then(()=>setReady(true)).catch(reason=>setError(String(reason)))
  },[])
  return <main className="mx-auto flex max-w-[920px] flex-col gap-lg p-xl">
    <header className="flex flex-col gap-xs">
      <p className="text-sm text-accent">5.5 · 流式 UI</p>
      <h1 className="text-2xl font-semibold text-foreground-heading">智能知识问答系统</h1>
      <p className="text-sm text-foreground-muted">消息逐段到达，停止、重试和下一轮都遵循同一份状态。</p>
    </header>
    {error && <p role="alert">模拟接口启动失败：{error}</p>}
    {ready ? <ChatPanel mock={mock} /> : !error && <p>正在准备模拟接口…</p>}
  </main>
}
