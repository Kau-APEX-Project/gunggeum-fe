export async function compareModels({files,createFeature,present,waitForPaint,onProgress=()=>{},signal,context={},order=['weightfp16','weightint8']}) {
  const output={schema_version:2,created_at:new Date().toISOString(),order,context,runs:[],status:'running',
    protocol:'Sequential models, same files; no artificial warmup. Preparation separate; photo latency starts after preparation. No original image or filename exported.'};
  const check=()=>{if(signal?.aborted)throw new Error('CANCELLED');};
  try {
    for(const model of order){
      check();let feature;
      const run={model,status:'running',errors:[],measurement:null};output.runs.push(run);
      try{
        onProgress(`${model} 준비 중`);
        feature=await createFeature(model);
        await feature.enter();check();
        for(let i=0;i<files.length;i++){
          check();onProgress(`${model} · ${i+1}/${files.length}장`);
          const startedAt=performance.now();
          present(files[i]);
          const result=await feature.selectPhoto(files[i],{trialId:`photo-${String(i+1).padStart(3,'0')}`,source:'comparison-selected-file',startedAt});
          if(result){
            try { await waitForPaint(feature,result.record_id,signal); }
            catch(e){ run.errors.push({trial_id:`photo-${String(i+1).padStart(3,'0')}`,stage:'display',message:String(e.message)});check(); }
          }
        }
        run.status='complete';
      }catch(e){run.status=signal?.aborted?'cancelled':'failed';run.errors.push({stage:'model',message:String(e.message)});}
      finally { if(feature){run.measurement=feature.getMeasurement();if(run.status==='complete'&&(run.errors.length||run.measurement.records?.some(r=>r.status==='failed')))run.status='partial';await feature.destroy();} }
      check();
    }
    output.status=output.runs.every(r=>r.status==='complete')?'complete':'partial';
  }catch(e){output.status=signal?.aborted?'cancelled':'failed';output.error=String(e.message);}
  return output;
}
