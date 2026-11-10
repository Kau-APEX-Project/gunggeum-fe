import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCameraRecognizer} from './camera.mjs';

const blob=new Blob(['photo']);
const model=new Uint8Array([1,2,3]);
const mapping={model_version:'field_expand_epoch12_weight_fp16',mapping_version:'test',classes:Array.from({length:60},(_,i)=>({class_index:i,name_ko:`전각${i}`,card_id:`b-${i}`,mapping_status:'confirmed'}))};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture({initFail=false,runFail=false,nan=false,gate=null,preprocessImage=async()=>new Float32Array(3*320*320),hash=null}={}) {
  const log={created:[],released:[],fetches:0,runs:[],states:[]};
  const ort={env:{wasm:{}},Tensor:class{dispose(){}},InferenceSession:{async create(_,o){
    const ep=o.executionProviders[0];log.created.push(ep);
    if(initFail&&ep==='webgpu')throw Error('init failure');
    return {async release(){log.released.push(ep);},async run(){
      log.runs.push(ep);if(gate)await gate.promise;
      if(runFail&&ep==='webgpu')throw Error('device lost');
      const data=new Float32Array(60);data[4]=10;if(nan&&ep==='webgpu')data[0]=NaN;
      return {logits:{data,dispose(){}}};
    }};
  }}};
  const api=createCameraRecognizer({ort,modelUrl:'model',mappingUrl:'mapping',
    expectedHash:hash??createHash('sha256').update(model).digest('hex'),
    fetchImpl:async url=>{log.fetches++;return {ok:true,json:async()=>mapping,arrayBuffer:async()=>model.buffer};},
    preprocessImage,hasWebGPU:async()=>true,onState:s=>log.states.push(s.status)});
  return {api,log};
}
test('parallel preparation shares one download and session',async()=>{
  const {api,log}=fixture();await Promise.all([api.prepare(),api.prepare(),api.prepare()]);
  assert.equal(log.fetches,2);assert.deepEqual(log.created,['webgpu']);
  const r=await api.recognize(blob);assert.equal(r.candidates[0].card_id,'b-4');assert.equal(r.candidates.length,3);
  await api.prepare();assert.equal(log.fetches,2);await api.dispose();
});
for(const type of ['initFail','runFail','nan'])test(`${type}: fallback to WASM`,async()=>{
  const {api,log}=fixture({[type]:true});const r=await api.recognize(blob);
  assert.equal(r.provider,'wasm');assert.deepEqual(log.created,['webgpu','wasm']);
  await api.recognize(blob);assert.equal(log.created.length,2);await api.dispose();
});
test('new request suppresses an in-flight stale result',async()=>{
  const gate=deferred(),{api,log}=fixture({gate});await api.prepare();
  const first=api.recognize(blob);const rejection=assert.rejects(first,{code:'SUPERSEDED'});
  while(!log.runs.length)await new Promise(r=>setTimeout(r,0));
  const second=api.recognize(blob);gate.resolve();await rejection;
  assert.equal((await second).request_id,2);await api.dispose();
});
test('dispose waits for inference and prohibits reuse',async()=>{
  const gate=deferred(),{api,log}=fixture({gate});await api.prepare();
  const pending=api.recognize(blob);const rejection=assert.rejects(pending,{code:'DISPOSED'});
  while(!log.runs.length)await new Promise(r=>setTimeout(r,0));
  const disposed=api.dispose();assert.equal(log.released.length,0);gate.resolve();
  await rejection;await disposed;assert.deepEqual(log.released,['webgpu']);
  assert.throws(()=>api.prepare(),{code:'DISPOSED'});
});
test('invalid model hash never creates an execution session',async()=>{
  const {api,log}=fixture({hash:'wrong'});await assert.rejects(api.prepare(),{code:'MODEL_MISMATCH'});
  assert.equal(log.created.length,0);await api.dispose();
});
test('empty input is rejected before loading',async()=>{
  const {api,log}=fixture();await assert.rejects(api.recognize(new Blob()),{code:'INVALID_IMAGE'});
  assert.equal(log.fetches,0);await api.dispose();
});
test('decode failure does not trigger GPU fallback',async()=>{
  const {api,log}=fixture({preprocessImage:async()=>{const e=Error('decode');e.code='IMAGE_DECODE_FAILED';throw e;}});
  await assert.rejects(api.recognize(blob),{code:'IMAGE_DECODE_FAILED'});
  assert.deepEqual(log.created,['webgpu']);await api.dispose();
});
