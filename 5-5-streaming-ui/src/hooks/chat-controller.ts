import { streamChat, ChatStreamError } from '../lib/chat-stream.ts'
import type { ChatEvent, ChatPayload } from '../lib/chat-stream.ts'
import type { ChatStore, ChatError, ChatState } from '../store/chat-store.ts'

export interface ChatOptions {
  endpoint: string
  knowledgeBaseId?: number
  firstTokenTimeoutMs?: number
  idleTimeoutMs?: number
  onError?: (error: ChatError) => void
  onFinish?: (state: ChatState) => void
  stream?: (endpoint: string, payload: ChatPayload, signal: AbortSignal) => AsyncGenerator<ChatEvent>
}

/** Imperative part of useChat, extracted so races can be tested without a DOM. */
export function createChatController(store: ChatStore, options: ChatOptions) {
  let sequence = 0
  let active: { id: number; controller: AbortController; timer?: ReturnType<typeof setTimeout> } | undefined
  const valid = (id: number) => active?.id === id
  const release = (id: number) => {
    if (!valid(id)) return
    const request = active!
    active = undefined // Invalidate before abort/catch/finally can run.
    clearTimeout(request.timer)
    return request
  }
  const fail = (id: number, code: string, message: string) => {
    const request = release(id)
    if (!request) return
    const phase = store.getState().status === 'streaming' ? 'streaming' : 'thinking'
    const error: ChatError = { code, message, phase, retryable: !['HTTP_401', 'HTTP_403'].includes(code) }
    store.fail(error)
    request.controller.abort()
    options.onError?.(error)
  }
  const armTimer = (id: number, phase: 'thinking' | 'streaming') => {
    if (!valid(id)) return
    clearTimeout(active!.timer)
    const delay = phase === 'thinking' ? (options.firstTokenTimeoutMs ?? 15000) : (options.idleTimeoutMs ?? 15000)
    active!.timer = setTimeout(() => fail(id, phase === 'thinking' ? 'FIRST_TOKEN_TIMEOUT' : 'IDLE_TIMEOUT',
      phase === 'thinking' ? '等待回答超时，请重试' : '输出等待超时，已保留收到的内容'), delay)
  }
  async function sendMessage(question: string, retry = false) {
    if (active || !question.trim()) return
    store.begin(question.trim(), retry)
    const id = ++sequence
    const controller = new AbortController()
    active = { id, controller }
    armTimer(id, 'thinking')
    const state = store.getState()
    const payload: ChatPayload = { knowledgeBaseId: options.knowledgeBaseId ?? 1, question: question.trim(), sessionId: state.sessionId, conversationId: state.conversationId }
    try {
      for await (const event of (options.stream ?? streamChat)(options.endpoint, payload, controller.signal)) {
        if (!valid(id)) return
        if (event.type === 'token' && event.text) {
          store.append(event.text)
          armTimer(id, 'streaming')
        } else if (event.type === 'meta') {
          store.setGrounded(event.grounded)
        } else if (event.type === 'error') {
          fail(id, event.code, event.message)
          return
        } else if (event.type === 'done') {
          if (store.getState().status !== 'streaming') { fail(id, 'EMPTY_ANSWER', '服务未返回回答文本，请重试'); return }
          release(id)
          store.finish('completed', event.conversationId)
          options.onFinish?.(store.getState())
          return
        }
      }
      if (valid(id)) fail(id, 'UNEXPECTED_EOF', '回答流意外结束，已保留收到的内容')
    } catch (error) {
      if (!valid(id)) return // Stop and timeout already chose their distinct terminal states.
      fail(id, error instanceof ChatStreamError ? error.code : 'NETWORK_ERROR', error instanceof Error ? error.message : '网络连接失败')
    } finally {
      const request = release(id)
      request?.controller.abort()
    }
  }
  function stop() {
    if (!active) return
    const request = release(active.id)!
    store.finish('aborted') // Save reason before aborting the asynchronous reader.
    request.controller.abort()
  }
  function retry() {
    const state = store.getState()
    if (active || (state.status !== 'error' && state.finishReason !== 'aborted') || state.error?.retryable === false) return
    const question = state.messages.find(m => m.roundId === state.roundId && m.role === 'user')?.content
    if (question) return sendMessage(question, true)
  }
  return { sendMessage, stop, retry, reset: () => { if (!active) store.reset() }, dispose: stop }
}
