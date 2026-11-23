'use client'
import { useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/use-chat'
import { mockControl } from '../mocks/chat-handlers'
import type { Scenario } from '../mocks/chat-handlers'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { Button } from './ui/button'
const labels = { idle: '等待提问', thinking: '正在等待回答', streaming: '正在输出', done: '本轮结束', error: '回答未完成' }
const scenarios: [Scenario, string][] = [['normal','正常完成'],['slow','慢速输出 / 停止'],['timeout','首段超时'],['idle-timeout','输出空闲超时'],['network-error','已有内容后断网'],['stream-error','流内错误'],['http-error','HTTP 401'],['empty','空回答'],['malformed','协议错误']]

export function ChatPanel({ mock = true, endpoint = '/api/chat' }: { mock?: boolean; endpoint?: string }) {
  const chat = useChat({ endpoint, firstTokenTimeoutMs: mock ? 3000 : 15000, idleTimeoutMs: mock ? 3500 : 15000 })
  const busy = chat.status === 'thinking' || chat.status === 'streaming'
  const [scenario, setScenario] = useState<Scenario>('normal')
  const list = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  useEffect(() => { if (following.current && list.current) list.current.scrollTop = list.current.scrollHeight }, [chat.messages, chat.status])
  return <section className="flex flex-col gap-md">
    {mock && <aside className="flex flex-wrap items-center gap-sm rounded-lg border border-border bg-surface p-md text-sm">
      <strong className="text-foreground-heading">模拟场景</strong>
      <select aria-label="模拟场景" className="rounded border border-border bg-surface p-sm" value={scenario} disabled={busy} onChange={event => {
        const next = event.target.value as Scenario;setScenario(next);mockControl.scenario = next
      }}>{scenarios.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <span className="text-foreground-muted">首段阈值 3 秒 · 输出空闲阈值 3.5 秒</span>
      {chat.status === 'streaming' && <Button variant="outline" size="sm" onClick={()=>mockControl.disconnect?.()}>模拟断网</Button>}
    </aside>}
    <div className="flex items-center justify-between border-b border-border pb-sm">
      <span role="status" data-testid="flow-status" data-state={chat.status} className="text-sm font-medium">{labels[chat.status]} · {chat.status}</span>
      <Button size="sm" variant="ghost" disabled={busy} onClick={chat.reset}>新会话</Button>
    </div>
    <div ref={list} data-testid="messages" className="flex h-[480px] flex-col gap-lg overflow-y-auto pr-sm" onScroll={()=>{
      const el=list.current;if(el)following.current=el.scrollHeight-el.scrollTop-el.clientHeight<80
    }}>
      {!chat.messages.length && <p className="my-auto text-center text-foreground-muted">从一个问题开始，观察回答逐段到达。</p>}
      {chat.messages.map(message=><ChatMessage key={message.id} role={message.role} content={message.content} status={message.status} grounded={message.grounded} aborted={message.aborted} />)}
      {chat.status === 'thinking' && <p className="animate-pulse text-foreground-muted">正在等待回答…</p>}
      {chat.finishReason === 'aborted' && <p className="text-sm text-foreground-muted">本轮已中止，已收到的内容已保留。</p>}
      {chat.error && <div role="alert" className="rounded-md bg-error-subtle p-md text-error">
        <p>{chat.error.phase === 'streaming' ? '回答未完成，已保留收到的内容。' : '暂时没有收到回答。'}</p>
        <p className="text-sm">{chat.error.message}（{chat.error.code}）</p>
        {!chat.error.retryable && <p className="text-sm">请恢复登录或访问权限后再发送。</p>}
      </div>}
    </div>
    <div className="flex justify-end gap-sm">
      {busy && <Button variant="outline" onClick={chat.stop}>停止生成</Button>}
      {(chat.error?.retryable || chat.finishReason === 'aborted') && <Button variant="outline" onClick={()=>void chat.retry()}>再试一次</Button>}
    </div>
    <ChatInput disabled={busy} onSubmit={question=>{following.current=true;void chat.sendMessage(question)}} />
    <p className="text-xs text-foreground-muted">{mock ? 'MSW 模拟接口 · 不调用真实模型' : `真实接口 · ${endpoint}`} · {chat.conversationId ? `会话 ${chat.conversationId}` : '会话尚未完成首轮'}</p>
  </section>
}
