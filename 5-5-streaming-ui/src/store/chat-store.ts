export type ChatStatus = 'idle' | 'thinking' | 'streaming' | 'done' | 'error'
export interface Message {
  id: string
  roundId: string
  role: 'user' | 'assistant'
  content: string
  status: 'streaming' | 'done' | 'error'
  aborted?: boolean
  grounded?: boolean
}
export interface ChatError {
  code: string
  message: string
  phase: 'thinking' | 'streaming'
  retryable: boolean
}
export interface ChatState {
  messages: Message[]
  status: ChatStatus
  error?: ChatError
  finishReason?: 'completed' | 'aborted'
  sessionId: string
  conversationId?: number
  roundId?: string
  grounded?: boolean
}
export interface ChatStore {
  getState(): ChatState
  subscribe(listener: () => void): () => void
  begin(question: string, retry?: boolean): void
  append(text: string): void
  setGrounded(grounded: boolean): void
  finish(reason: 'completed' | 'aborted', conversationId?: number): void
  fail(error: ChatError): void
  reset(): void
}
const allowed: Record<ChatStatus, ChatStatus[]> = {
  idle: ['thinking'], thinking: ['streaming', 'done', 'error'],
  streaming: ['streaming', 'done', 'error'], done: ['thinking'], error: ['thinking'],
}
const initialState = (): ChatState => ({ messages: [], status: 'idle', sessionId: crypto.randomUUID() })

/** One external store; React only subscribes. No copy of messages in the hook. */
export function createChatStore(): ChatStore {
  let state = initialState()
  const listeners = new Set<() => void>()
  const update = (patch: Partial<ChatState>) => {
    if (patch.status && patch.status !== state.status && !allowed[state.status].includes(patch.status)) {
      throw new Error(`Illegal transition: ${state.status} -> ${patch.status}`)
    }
    state = { ...state, ...patch }
    listeners.forEach(listener => listener())
  }
  const currentAnswer = () => state.messages.find(m => m.roundId === state.roundId && m.role === 'assistant')
  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    begin(question, retry = false) {
      if (state.status === 'thinking' || state.status === 'streaming') throw new Error('Request already active')
      if (retry && state.status !== 'error' && state.finishReason !== 'aborted') throw new Error('Nothing to retry')
      const roundId = retry ? state.roundId! : crypto.randomUUID()
      const messages = retry
        ? state.messages.filter(m => !(m.roundId === roundId && m.role === 'assistant'))
        : [...state.messages, { id: crypto.randomUUID(), roundId, role: 'user' as const, content: question, status: 'done' as const }]
      update({ messages, roundId, status: 'thinking', error: undefined, finishReason: undefined, grounded: undefined })
    },
    append(text) {
      if (!text) return
      if (state.status !== 'thinking' && state.status !== 'streaming') throw new Error('Cannot append outside active request')
      const answer = currentAnswer()
      // First text creates the message and advances flow atomically.
      const messages = answer
        ? state.messages.map(m => m.id === answer.id ? { ...m, content: m.content + text } : m)
        : [...state.messages, { id: crypto.randomUUID(), roundId: state.roundId!, role: 'assistant' as const, content: text, status: 'streaming' as const, grounded: state.grounded }]
      update({ status: 'streaming', messages })
    },
    setGrounded(grounded) {
      update({ grounded, messages: state.messages.map(m => m.roundId === state.roundId && m.role === 'assistant' ? { ...m, grounded } : m) })
    },
    finish(reason, conversationId) {
      if (reason === 'completed' && !currentAnswer()?.content) throw new Error('Empty answer cannot complete')
      update({ status: 'done', finishReason: reason, conversationId: conversationId ?? state.conversationId,
        messages: state.messages.map(m => m.roundId === state.roundId && m.role === 'assistant' ? { ...m, status: 'done', aborted: reason === 'aborted' } : m) })
    },
    fail(error) {
      update({ status: 'error', error, messages: state.messages.map(m => m.roundId === state.roundId && m.role === 'assistant' ? { ...m, status: 'error' } : m) })
    },
    reset() {
      if (state.status === 'thinking' || state.status === 'streaming') throw new Error('Stop before reset')
      state = initialState(); listeners.forEach(listener => listener())
    },
  }
}
