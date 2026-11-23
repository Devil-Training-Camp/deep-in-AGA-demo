'use client'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createChatStore } from '../store/chat-store'
import { createChatController } from './chat-controller'
import type { ChatOptions } from './chat-controller'
export type { ChatOptions } from './chat-controller'

export function useChat(options: ChatOptions) {
  const runtime = useRef<ReturnType<typeof createRuntime> | null>(null)
  if (!runtime.current) runtime.current = createRuntime(options)
  const { store, controller } = runtime.current
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  useEffect(() => () => controller.dispose(), [controller])
  return { ...state, isStreaming: state.status === 'streaming', ...controller }
}
function createRuntime(options: ChatOptions) {
  const store = createChatStore()
  return { store, controller: createChatController(store, options) }
}
