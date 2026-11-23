import { test, after, before } from 'node:test'
import assert from 'node:assert/strict'
import { http } from 'msw'
import { setupServer } from 'msw/node'
import { mockResponse } from '../src/mocks/chat-handlers.ts'
import type { Scenario } from '../src/mocks/chat-handlers.ts'
import { createChatStore } from '../src/store/chat-store.ts'
import { createChatController } from '../src/hooks/chat-controller.ts'
let scenario:Scenario='normal'
const server=setupServer(http.post('http://streaming.test/api/chat',({request})=>mockResponse(scenario,request.signal)))
before(()=>server.listen({onUnhandledRequest:'error'}));after(()=>server.close())
test('MSW normal SSE crosses real fetch/parser/store and preserves meta',async()=>{
 scenario='normal';const s=createChatStore();const c=createChatController(s,{endpoint:'http://streaming.test/api/chat'})
 await c.sendMessage('问题');assert.equal(s.getState().status,'done');assert.equal(s.getState().conversationId,55);assert.equal(s.getState().messages[1].grounded,true)
})
test('MSW HTTP, malformed, empty, first token timeout',async()=>{
 for(const [mode,code] of [['http-error','HTTP_401'],['malformed','INVALID_EVENT'],['empty','EMPTY_ANSWER'],['timeout','FIRST_TOKEN_TIMEOUT']] as [Scenario,string][]){
 scenario=mode;const s=createChatStore();const c=createChatController(s,{endpoint:'http://streaming.test/api/chat',firstTokenTimeoutMs:mode==='timeout'?30:2000});await c.sendMessage('问题');assert.equal(s.getState().error?.code,code)
 }
})
test('MSW partial network and stream errors retain text',async()=>{
 for(const mode of ['network-error','stream-error'] as Scenario[]){
 scenario=mode;const s=createChatStore();const c=createChatController(s,{endpoint:'http://streaming.test/api/chat'});await c.sendMessage('问题');assert.equal(s.getState().status,'error');assert.equal(s.getState().error?.phase,'streaming');assert.ok(s.getState().messages[1].content.length>0)
 }
})
