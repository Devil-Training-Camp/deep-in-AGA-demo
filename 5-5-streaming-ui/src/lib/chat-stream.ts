export interface ChatPayload {
  knowledgeBaseId: number
  sessionId: string
  question: string
  conversationId?: number
}
export type ChatEvent =
  | { type: 'token'; text: string }
  | { type: 'meta'; grounded: boolean }
  | { type: 'done'; conversationId: number }
  | { type: 'error'; code: string; message: string }

export class ChatStreamError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ChatStreamError'
    this.code = code
  }
}

function parseFrame(frame: string): ChatEvent | undefined {
  let event = ''
  const data: string[] = []
  for (const line of frame.split(/\r\n|\r|\n/)) {
    if (line.startsWith(':')) continue
    const separator = line.indexOf(':')
    const field = separator < 0 ? line : line.slice(0, separator)
    const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '')
    if (field === 'event') event = value
    if (field === 'data') data.push(value)
  }
  if (!data.length) return
  let body: Record<string, unknown>
  try { body = JSON.parse(data.join('\n')) } catch {
    throw new ChatStreamError('INVALID_EVENT', 'SSE 数据不是合法 JSON')
  }
  if (body && typeof body === 'object') {
    if (event === 'token' && typeof body.text === 'string') return { type: 'token', text: body.text }
    if (event === 'meta' && typeof body.grounded === 'boolean') return { type: 'meta', grounded: body.grounded }
    if (event === 'done' && Number.isInteger(body.conversationId)) return { type: 'done', conversationId: body.conversationId as number }
    if (event === 'error' && typeof body.code === 'string' && typeof body.message === 'string') {
      return { type: 'error', code: body.code, message: body.message }
    }
  }
  throw new ChatStreamError('INVALID_EVENT', `SSE 事件不符合协议：${event}`)
}

/** Network chunks are not events. Keep incomplete frames across reads. */
export async function* streamChat(
  endpoint: string, payload: ChatPayload, signal: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const response = await fetch(endpoint, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(payload), signal,
  })
  if (!response.ok) throw new ChatStreamError(`HTTP_${response.status}`, `请求失败（HTTP ${response.status}）`)
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new ChatStreamError('INVALID_CONTENT_TYPE', '响应不是 SSE 事件流')
  }
  if (!response.body) throw new ChatStreamError('NO_BODY', '响应没有可读取的数据流')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  // Native fetch rejects reads after abort. Explicit cancellation also covers mocks.
  const cancel = () => { void reader.cancel(signal.reason).catch(() => {}) }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    for (;;) {
      signal.throwIfAborted()
      const { value, done } = await reader.read()
      signal.throwIfAborted()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      let boundary: RegExpExecArray | null
      while ((boundary = /\r\n\r\n|\n\n|\r\r/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)
        const event = parseFrame(frame)
        if (!event) continue
        yield event
        if (event.type === 'done' || event.type === 'error') return
      }
      if (done) throw new ChatStreamError('UNEXPECTED_EOF', '回答流意外结束，未收到完成事件')
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
