import { setupWorker } from 'msw/browser'
import { handlers } from './chat-handlers'
export const worker = setupWorker(...handlers)
let starting: Promise<unknown> | undefined
export function startMock() {
  starting ??= worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  return starting
}
