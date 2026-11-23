import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createChatStore } from '../src/store/chat-store.ts'
import { createChatController } from '../src/hooks/chat-controller.ts'
import type { ChatEvent, ChatPayload } from '../src/lib/chat-stream.ts'
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
function record(store: ReturnType<typeof createChatStore>) { const states=['idle'];store.subscribe(()=>{const s=store.getState().status;if(states.at(-1)!==s)states.push(s)});return states }
test('normal flow, meta and conversation reused by next turn',async()=>{
 const s=createChatStore();const states=record(s);const payloads:ChatPayload[]=[]
 const c=createChatController(s,{endpoint:'/api/chat',stream:async function*(_,p){payloads.push(p);yield {type:'token',text:'你好'};yield {type:'meta',grounded:true};yield {type:'done',conversationId:55}}})
 await c.sendMessage('问题');assert.deepEqual(states,['idle','thinking','streaming','done']);assert.equal(s.getState().messages[1].grounded,true)
 await c.sendMessage('下一轮');assert.equal(payloads[1].conversationId,55);assert.equal(payloads[0].sessionId,payloads[1].sessionId);assert.equal(s.getState().messages.length,4)
 console.log('normal states:',states.join(' → '))
})
test('stop retains content and late old completion cannot overwrite new request',async()=>{
 const s=createChatStore();const states=record(s);let run=0
 const c=createChatController(s,{endpoint:'/api/chat',stream:async function*(){const thisRun=++run;yield {type:'token',text:thisRun===1?'残答':'新回答'};await sleep(thisRun===1?35:5);yield {type:'done',conversationId:55}}})
 const first=c.sendMessage('问题');await sleep(2);c.stop();assert.equal(s.getState().finishReason,'aborted');assert.equal(s.getState().messages[1].aborted,true)
 await c.sendMessage('下一轮');await first;assert.equal(s.getState().status,'done');assert.equal(s.getState().messages[1].aborted,true);assert.equal(s.getState().messages[3].content,'新回答')
 console.log('stop/next states:',states.join(' → '))
})
test('thinking stop creates no empty assistant and permits retry',async()=>{
 const s=createChatStore();let run=0
 const c=createChatController(s,{endpoint:'/api/chat',stream:async function*(){if(++run===1)await sleep(20);yield {type:'token',text:'回答'};yield {type:'done',conversationId:55}}})
 const pending=c.sendMessage('问题');c.stop();assert.equal(s.getState().messages.length,1);assert.equal(s.getState().status,'done');await c.retry();await pending;assert.equal(s.getState().messages.length,2)
})
test('first token timeout remains error after cancellation; error callback once',async()=>{
 const s=createChatStore();const states=record(s);let errors=0
 const c=createChatController(s,{endpoint:'/api/chat',firstTokenTimeoutMs:5,onError(){errors++},stream:async function*(){await sleep(20);yield {type:'token',text:'迟到'};yield {type:'done',conversationId:55}}})
 await c.sendMessage('问题');assert.equal(s.getState().status,'error');assert.equal(s.getState().error?.code,'FIRST_TOKEN_TIMEOUT');assert.equal(s.getState().messages.length,1);assert.equal(errors,1)
 console.log('timeout states:',states.join(' → '))
})
test('partial network error retained; retry replaces answer without duplicating question',async()=>{
 const s=createChatStore();const states=record(s);let run=0
 const c=createChatController(s,{endpoint:'/api/chat',stream:async function*(){yield {type:'token',text:'部分'};if(++run===1)throw new TypeError('断网');yield {type:'token',text:'完成'};yield {type:'done',conversationId:55}}})
 await c.sendMessage('问题');assert.equal(s.getState().error?.phase,'streaming');assert.equal(s.getState().messages[1].content,'部分');assert.equal(s.getState().messages[1].status,'error')
 await c.retry();assert.equal(s.getState().messages.length,2);assert.equal(s.getState().messages[1].content,'部分完成');console.log('error/retry states:',states.join(' → '))
})
test('stream error and empty answer are distinct error codes',async()=>{
 for(const [event,code] of [[{type:'error',code:'GENERATION_FAILED',message:'failed'},'GENERATION_FAILED'],[{type:'done',conversationId:55},'EMPTY_ANSWER']] as [ChatEvent,string][]){
 const s=createChatStore();const c=createChatController(s,{endpoint:'/api/chat',stream:async function*(){yield event}});await c.sendMessage('问题');assert.equal(s.getState().error?.code,code)
 }
})
test('idle timeout keeps partial content; meta and empty tokens do not reset TTFT',async()=>{
 const s=createChatStore();const c=createChatController(s,{endpoint:'/api/chat',idleTimeoutMs:5,stream:async function*(){yield {type:'token',text:'部分'};await sleep(20)}})
 await c.sendMessage('问题');assert.equal(s.getState().error?.code,'IDLE_TIMEOUT');assert.equal(s.getState().messages[1].content,'部分')
 const t=createChatStore();const d=createChatController(t,{endpoint:'/api/chat',firstTokenTimeoutMs:5,stream:async function*(){yield {type:'meta',grounded:true};yield {type:'token',text:''};await sleep(20)}})
 await d.sendMessage('问题');assert.equal(t.getState().error?.code,'FIRST_TOKEN_TIMEOUT');assert.equal(t.getState().messages.length,1)
})
