import test from 'node:test';
import assert from 'node:assert/strict';
import {compareModels} from './compare.mjs';
test('both models use same files and IDs sequentially, paint before destruction',async()=>{
 const files=[{},{}],log=[];let active=0;
 const result=await compareModels({files,present:()=>{},waitForPaint:async(f,id)=>log.push(['paint',id]),createFeature:async(model)=>{
  assert.equal(active++,0);const records=[];return {enter:async()=>{},selectPhoto:async(file,opt)=>{assert.equal(file,files[records.length]);records.push(opt);log.push([model,opt.trialId]);return {record_id:opt.trialId};},getMeasurement:()=>({records}),destroy:async()=>{active--;log.push(['destroy',model]);}};
 }});
 assert.equal(result.status,'complete');assert.equal(active,0);assert.deepEqual(result.runs.map(r=>r.measurement.records.map(x=>x.trialId)),[['photo-001','photo-002'],['photo-001','photo-002']]);assert.equal(log[4][0],'destroy');
});
test('model failure is saved and next model still runs',async()=>{
 let destroyed=0;
 const result=await compareModels({files:[{}],present:()=>{},waitForPaint:async()=>{},createFeature:async(model)=>({enter:async()=>{if(model==='weightfp16')throw Error('setup');},selectPhoto:async()=>null,getMeasurement:()=>({}),destroy:async()=>{destroyed++;}})});
 assert.equal(result.status,'partial');assert.equal(result.runs.length,2);assert.equal(destroyed,2);
});
test('cancel preserves first model measurements and prevents second model',async()=>{
 const controller=new AbortController();let destroyed=0;
 const result=await compareModels({files:[{}],signal:controller.signal,present:()=>{},waitForPaint:async()=>{},createFeature:async()=>({enter:async()=>{},selectPhoto:async()=>{controller.abort();return null;},getMeasurement:()=>({records:[1]}),destroy:async()=>{destroyed++;}})});
 assert.equal(result.status,'cancelled');assert.equal(result.runs.length,1);assert.equal(destroyed,1);assert.equal(result.runs[0].measurement.records.length,1);
});
