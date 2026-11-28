import {createCameraRecognizer} from './camera.mjs';
import {MODELS} from './models.mjs';

export async function createCameraFeature({model='weightfp16',baseUrl,
  onState=()=>{},onCandidates=()=>{},onOpenBuilding=()=>{},onError=()=>{},
  context={},ort:providedOrt}) {
  const config=MODELS[model];if(!config)throw Error('Unknown model');
  const base=new URL(baseUrl??`${import.meta.env?.BASE_URL??'/'}camera/`,location.origin);
  const ort=providedOrt??await import(/* @vite-ignore */new URL('ort/ort.webgpu.min.mjs',base).href);
  let latest=null,sequence=0,closed=false,entryTime=null,visibilityEpoch=0;
  const records=[],preparations=[];
  const instanceId=globalThis.crypto?.randomUUID?.()??String(Date.now());
  const visibility=()=>{visibilityEpoch++;};
  document.addEventListener('visibilitychange',visibility);
  const camera=createCameraRecognizer({ort,modelUrl:new URL(config.model,base).href,
    mappingUrl:new URL(config.mapping,base).href,wasmPaths:new URL('ort/',base).href,
    expectedHash:config.sha256,modelVersion:config.modelVersion,onState,
    onMeasurement:r=>preparations.push({...r,recorded_at:new Date().toISOString()})});
  const showError=e=>{if(!['SUPERSEDED','DISPOSED'].includes(e.code))onError(e.code??'ERROR',e.message);};
  function snapshot(){return {schema_version:1,measurement_revision:'20261127-http',instance_id:instanceId,date:new Date().toISOString(),
    model:config.modelVersion,model_sha256:config.sha256,runtime_version:providedOrt?'frontend_injected_unknown':'1.30.0',
    user_agent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,
    secure_context:globalThis.isSecureContext,origin:location.origin,context:{...context},
    timing_clock:'performance.now',wasm_threads:1,
    display_metric:'two requestAnimationFrame callbacks after FE confirms candidate DOM commit; paint opportunity estimate, not hardware display timestamp',
    preparations:structuredClone(preparations),records:structuredClone(records)};}
  return {
    async enter(){entryTime=performance.now();try{const s=await camera.prepare();preparations.push({type:'screen_entry',screen_to_ready_ms:performance.now()-entryTime,provider:s.provider});return s;}catch(e){preparations.push({type:'preparation_error',code:e.code,message:e.message,stage:e.stage,detail:e.detail??String(e.cause?.message??e.message),fallbacks:e.fallbacks??[]});showError(e);throw e;}},
    async selectPhoto(file,{trialId='',source='unknown',expectedName=null,startedAt=performance.now()}={}){
      if(closed)throw Error('Disposed');
      const call=++sequence,start=performance.now(),epoch=visibilityEpoch;
      const validStart=Number.isFinite(startedAt)&&startedAt>=0&&startedAt<=start;
      const t=validStart?startedAt:start;
      const record={record_id:instanceId+':'+call,trial_id:trialId,source,expected_name:expectedName,
        recorded_at:new Date().toISOString(),file_bytes:file?.size,mime:file?.type,
        input_started_at:t,status:'running',display_ms:null,module_result_ms:null,
        first_photo:records.length===0,hidden_at_start:document.hidden,visibility_epoch:epoch};
      records.push(record);latest=null;onCandidates([]);
      try{
        const r=await camera.recognize(file);
        if(call!==sequence||closed)throw Object.assign(Error('Superseded'),{code:'SUPERSEDED'});
        record.module_result_ms=performance.now()-t;record.provider=r.provider;
        record.timing=r.timing;record.preparation=r.preparation;record.fallbacks=r.fallbacks;
        record.candidates=r.candidates;record.visibility_changed=visibilityEpoch!==epoch;
        if(expectedName!==null)record.top_k_correct=[1,2,3].map(k=>r.candidates.slice(0,k).some(c=>c.name_ko===expectedName));
        record.status='result_ready';latest={...r,record_id:record.record_id};
        onCandidates(r.candidates,{recordId:record.record_id,provider:r.provider,model:config.modelVersion});
        return latest;
      }catch(e){record.status='failed';record.code=e.code??'ERROR';record.message=e.message;record.stage=e.stage;record.detail=e.detail??String(e.cause?.message??e.message);record.error_ms=performance.now()-t;record.visibility_changed=visibilityEpoch!==epoch;showError(e);return null;}
    },
    async markCandidatesRendered(recordId){
      const r=records.find(x=>x.record_id===recordId);
      if(!r||r.status!=='result_ready'||latest?.record_id!==recordId)return false;
      r.dom_commit_ms=performance.now()-r.input_started_at;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      if(closed||latest?.record_id!==recordId)return false;
      r.display_ms=performance.now()-r.input_started_at;
      r.visibility_changed=visibilityEpoch!==r.visibility_epoch;
      r.hidden_at_display=document.hidden;r.status='displayed';return true;
    },
    choose(candidate){if(!latest?.candidates.includes(candidate))return;
      if(candidate.mapping_status!=='confirmed'){onError('UNMAPPED_CARD','전각 연결 정보를 확인하세요.');return;}
      onOpenBuilding({cardId:candidate.card_id,poiId:candidate.poi_id,serial:candidate.building_serial});},
    setContext(values){Object.assign(context,values);},
    getMeasurement:snapshot,
    exportMeasurements(){const data=snapshot();const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=`camera_${model}_${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);return data;},
    leave(){sequence++;latest=null;camera.cancelPending();onCandidates([]);},
    async destroy(){closed=true;sequence++;latest=null;document.removeEventListener('visibilitychange',visibility);await camera.dispose();},
    getState:camera.getState
  };
}
