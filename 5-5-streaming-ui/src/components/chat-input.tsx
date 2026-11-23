'use client'
import { useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
export function ChatInput({ disabled, onSubmit }: { disabled: boolean; onSubmit: (question: string) => void }) {
  const [question, setQuestion] = useState('请解释流式 UI 的状态机，并给一个简短代码示例')
  return <form className="flex items-end gap-sm" onSubmit={event => {
    event.preventDefault()
    if (!question.trim() || disabled) return
    onSubmit(question); setQuestion('')
  }}>
    <Textarea aria-label="输入问题" placeholder="输入一个问题…" value={question} disabled={disabled} onChange={event => setQuestion(event.target.value)} className="min-h-20 resize-none bg-surface" />
    <Button type="submit" disabled={disabled || !question.trim()}>发送</Button>
  </form>
}
