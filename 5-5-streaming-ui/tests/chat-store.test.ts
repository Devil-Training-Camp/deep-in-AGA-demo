import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createChatStore } from '../src/store/chat-store.ts'
test('first text atomically creates one answer; later text preserves its ID',()=>{
 const s=createChatStore();s.begin('问题');s.setGrounded(true);s.append('你');const id=s.getState().messages[1].id;s.append('好');
 assert.equal(s.getState().messages[1].id,id);assert.equal(s.getState().messages[1].content,'你好');assert.equal(s.getState().messages[1].grounded,true)
 s.finish('completed',55);s.begin('下一轮');assert.equal(s.getState().messages.length,3);assert.equal(s.getState().conversationId,55)
})
test('illegal transitions fail; aborted answer is preserved; retry does not duplicate user',()=>{
 const s=createChatStore();assert.throws(()=>s.append('bad'));assert.throws(()=>s.finish('aborted'),/Illegal transition/)
 s.begin('问题');s.append('部分');s.finish('aborted');assert.equal(s.getState().messages[1].aborted,true)
 s.begin('问题',true);assert.equal(s.getState().messages.length,1);s.append('完成');s.finish('completed');assert.equal(s.getState().messages.length,2)
})
