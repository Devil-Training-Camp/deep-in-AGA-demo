import { test } from 'node:test'
import assert from 'node:assert/strict'
import { streamChat } from '../src/lib/chat-stream.ts'
const payload = { knowledgeBaseId: 1, sessionId: 'test', question: '你好' }
const wire = 'event: token\ndata: {"text":"你好"}\n\nevent: meta\ndata: {"grounded":true}\n\nevent: done\ndata: {"conversationId":55}\n\n'
function response(text: string, split = 1) {
  const bytes = new TextEncoder().encode(text)
  return new Response(new ReadableStream({ start(c) { for(let i=0;i<bytes.length;i+=split)c.enqueue(bytes.slice(i,i+split)); c.close() } }), {headers:{'Content-Type':'text/event-stream'}})
}
test('byte splits preserve UTF-8, frames and metadata; combined frames also parse', async () => {
  const old = globalThis.fetch
  try { for(const split of [1, 17, 999]) {
    globalThis.fetch = async () => response(wire, split)
    const events = []; for await(const e of streamChat('/api/chat',payload,new AbortController().signal))events.push(e)
    assert.deepEqual(events,[{type:'token',text:'你好'},{type:'meta',grounded:true},{type:'done',conversationId:55}])
  } } finally {globalThis.fetch=old}
})
test('CRLF, comments and blank token', async () => {
 const old=globalThis.fetch;globalThis.fetch=async()=>response(': heartbeat\r\n\r\n'+wire.replaceAll('\n','\r\n'))
 try {const events=[];for await(const e of streamChat('/api/chat',payload,new AbortController().signal))events.push(e);assert.equal(events.length,3)}finally{globalThis.fetch=old}
})
test('missing done and malformed JSON are recognizable errors',async()=>{
 const old=globalThis.fetch
 try{for(const [text,code] of [['event: token\ndata: {"text":"partial"}\n\n','UNEXPECTED_EOF'],['event: token\ndata: invalid\n\n','INVALID_EVENT']]){
 globalThis.fetch=async()=>response(text)
 await assert.rejects(async()=>{for await(const e of streamChat('/api/chat',payload,new AbortController().signal))void e},{code})
 }}finally{globalThis.fetch=old}
})
test('active cancellation rejects with AbortError and cancels reader',async()=>{
 const old=globalThis.fetch;let cancelled=false
 globalThis.fetch=async()=>new Response(new ReadableStream({cancel(){cancelled=true}}),{headers:{'Content-Type':'text/event-stream'}})
 const controller=new AbortController();const run=(async()=>{for await(const e of streamChat('/api/chat',payload,controller.signal))void e})()
 setTimeout(()=>controller.abort(),5)
 try{await assert.rejects(run,{name:'AbortError'});assert.equal(cancelled,true)}finally{globalThis.fetch=old}
})
