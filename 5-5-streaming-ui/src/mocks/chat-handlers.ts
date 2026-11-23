import { http, HttpResponse } from 'msw'

export type Scenario = 'normal' | 'slow' | 'timeout' | 'idle-timeout' | 'network-error' | 'stream-error' | 'http-error' | 'empty' | 'malformed'
export const mockControl: { scenario: Scenario; disconnect?: () => void } = { scenario: 'normal' }
export const answerParts = [
  '流式 UI 可以用 **五个状态** 来描述。\n\n',
  '发送问题后进入 `thinking`，首段文本到达后进入 `streaming`。\n\n',
  '```ts\n',
  "const status = 'streaming'\n",
  'append(event.text)\n',
  '```\n\n',
  '正常结束进入 `done`；主动停止也进入 `done`，并保留“已中止”标记。\n\n',
  '网络异常进入 `error`，保留已收到的内容，并提供重试入口。',
]
const frame = (type: string, data: unknown) => `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`

/** Same custom event/data shape as 5.3. Split bytes deliberately, including UTF-8. */
export function mockResponse(scenario: Scenario, requestSignal?: AbortSignal): Response {
  if (scenario === 'http-error') return HttpResponse.json({ error: '模拟未认证' }, { status: 401 })
  const encoder = new TextEncoder()
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  let cleanup: () => void = () => {}
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const stop = () => { disposed = true; clearTimeout(timer); requestSignal?.removeEventListener('abort', onAbort); if (mockControl.disconnect === disconnect) mockControl.disconnect = undefined }
      const close = () => { if (!disposed) { stop(); controller.close() } }
      const disconnect = () => { if (!disposed) { stop(); controller.error(new TypeError('模拟网络断开')) } }
      const onAbort = () => close()
      cleanup = stop
      requestSignal?.addEventListener('abort', onAbort, { once: true })
      mockControl.disconnect = disconnect
      const emit = (type: string, data: unknown) => {
        const bytes = encoder.encode(frame(type, data))
        controller.enqueue(bytes.slice(0, 29)); controller.enqueue(bytes.slice(29))
      }
      if (scenario === 'timeout') return
      let index = 0
      const tick = () => {
        if (disposed) return
        if (scenario === 'empty') { emit('done', { conversationId: 55 }); close(); return }
        if (scenario === 'malformed') { controller.enqueue(encoder.encode('event: token\ndata: nope\n\n')); close(); return }
        if (index === 3 && scenario === 'network-error') { disconnect(); return }
        if (index === 3 && scenario === 'stream-error') { emit('error', { code: 'GENERATION_FAILED', message: '模拟生成失败，请重试' }); close(); return }
        if (index === 2 && scenario === 'idle-timeout') return
        if (index < answerParts.length) {
          emit('token', { text: answerParts[index++] })
          timer = setTimeout(tick, scenario === 'slow' ? 2000 : 480)
        } else {
          emit('meta', { grounded: true }); emit('done', { conversationId: 55 }); close()
        }
      }
      timer = setTimeout(tick, 600)
    },
    cancel() { cleanup() },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
export const handlers = [http.post('/api/chat', ({ request }) => mockResponse(mockControl.scenario, request.signal))]
