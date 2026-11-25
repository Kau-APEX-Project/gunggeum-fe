import {preprocess} from './preprocess.mjs';
import {RecognitionError, validateMapping, formatResult} from './results.mjs';

export const MODEL_SHA256 = '8257972fe0edb4a5aeb4b1bfdadd1578e5f4bc03cd981f73929e129ac0fa072c';


export function createCameraRecognizer({ort, modelUrl, mappingUrl, wasmPaths,
  expectedHash=MODEL_SHA256, modelVersion='exp_field_002_weightint8', onState=()=>{}, onMeasurement=()=>{},
  fetchImpl=globalThis.fetch, preprocessImage=preprocess,
  hasWebGPU=async()=>Boolean(await globalThis.navigator?.gpu?.requestAdapter()),
  maxBytes=20*1024*1024}) {
  let session=null, mapping=null, bytes=null, provider=null, preparation=null;
  let queue=Promise.resolve(), closed=false, disposal=null, sequence=0;
  let state={status:'idle', provider:null};
  let preparationInfo=null, fallbacks=[];
  const measure=r=>{try{onMeasurement(r);}catch{}};
  const emit=(status, extra={})=>{state={status,provider,...extra};try{onState({...state});}catch{}};
  const error=(code,message,cause)=>new RecognitionError(code,message,cause);
  const live=()=>{if(closed)throw error('DISPOSED','해제된 인식 모듈입니다.');};
  async function fetchOK(url) {
    const resource = String(url);
    const r=await fetchImpl(resource + (resource.includes('?')?'&':'?') + 'v='+expectedHash);
    if(!r.ok)throw error('DOWNLOAD_FAILED',`파일 요청 실패 (${r.status})`);
    return r;
  }
  async function release() {
    const old=session;session=null;provider=null;
    if(old)try{await old.release();}catch{}
  }
  async function create(ep) {
    const t=performance.now();
    const next=await ort.InferenceSession.create(bytes,{executionProviders:[ep],graphOptimizationLevel:'all'});
    session=next;provider=ep;
    return performance.now()-t;
  }
  async function initialize() {
    const start=performance.now(), stages={};
    try {
      ort.env.wasm.numThreads=1;
      if(wasmPaths)ort.env.wasm.wasmPaths=wasmPaths;
      emit('downloading');
      let t=performance.now();
      mapping=await(await fetchOK(mappingUrl)).json();validateMapping(mapping,modelVersion);stages.mapping_fetch_ms=performance.now()-t;
      if(!bytes) {
        t=performance.now();const candidate=await(await fetchOK(modelUrl)).arrayBuffer();stages.model_fetch_ms=performance.now()-t;t=performance.now();
        const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',candidate)),v=>v.toString(16).padStart(2,'0')).join('');
        if(digest!==expectedHash)throw error('MODEL_MISMATCH','모델 파일 버전을 확인하세요.');
        bytes=candidate;stages.hash_ms=performance.now()-t;
      }
      live();emit('initializing');
      try {
        if(!await hasWebGPU())throw error('WEBGPU_UNAVAILABLE','WebGPU를 사용할 수 없습니다.');
        stages.session_create_ms=await create('webgpu');
      } catch(e) {
        live();fallbacks.push({stage:'initialization',reason:String(e)});emit('fallback',{stage:'initialization',reason:String(e)});
        stages.session_create_ms=await create('wasm');
      }
      live();preparationInfo={...stages,total_ms:performance.now()-start,provider,fallbacks:[...fallbacks]};measure({type:'preparation',...preparationInfo});emit('ready',{preparation_ms:preparationInfo.total_ms});
      return {...state};
    } catch(e) {
      await release();
      if(!closed)emit('error',{code:e.code||'PREPARE_FAILED'});
      throw e.code?e:error('PREPARE_FAILED','모델을 준비하지 못했습니다.',e);
    }
  }
  function prepare() {
    live();
    if(preparation)return preparation;
    if(session)return Promise.resolve({...state});
    preparation=initialize().finally(()=>{preparation=null;});
    return preparation;
  }
  async function run(x,attempts) {
    const timing={provider};let started;
    let input,outputs;
    try {
      input=new ort.Tensor('float32',x,[1,3,320,320]);
      started=performance.now();outputs=await session.run({image:input});
      if(!outputs.logits)throw error('INVALID_OUTPUT','모델 출력이 없습니다.');
      const values=outputs.logits.getData ? await outputs.logits.getData() : outputs.logits.data;
      timing.inference_ms=performance.now()-started;const post=performance.now();const result=formatResult(values,mapping);timing.postprocess_ms=performance.now()-post;timing.ok=true;return result;
    } finally {
      if(started!==undefined&&!timing.ok)timing.failed_attempt_ms=performance.now()-started;attempts.push(timing);input?.dispose?.();
      if(outputs)Object.values(outputs).forEach(t=>t.dispose?.());
    }
  }
  function recognize(file) {
    live();
    if(!(file instanceof Blob)||!file.size||file.size>maxBytes)
      return Promise.reject(error('INVALID_IMAGE','20MB 이하의 비어 있지 않은 사진을 선택하세요.'));
    const id=++sequence,submitted=performance.now();
    const current=()=>{live();if(id!==sequence)throw error('SUPERSEDED','새 사진 요청으로 이전 결과를 취소했습니다.');};
    const task=async()=>{
      current();const start=performance.now();const timing={queue_ms:start-submitted,attempts:[]};
      try {
        let t=performance.now();await prepare();timing.prepare_wait_ms=performance.now()-t;current();emit('recognizing');
        t=performance.now();const x=await preprocessImage(file);timing.preprocess_ms=performance.now()-t;current();
        let result;
        try{result=await run(x,timing.attempts);}catch(e){
          current();if(provider!=='webgpu')throw e;
          fallbacks.push({stage:'inference',reason:String(e)});emit('fallback',{stage:'inference',reason:String(e)});
          const ft=performance.now();await release();await create('wasm');timing.fallback_setup_ms=performance.now()-ft;current();result=await run(x,timing.attempts);
        }
        current();const response={...result,request_id:id,provider,elapsed_ms:performance.now()-submitted,timing,preparation:preparationInfo,fallbacks:[...fallbacks]};
        emit('ready');return response;
      }catch(e){
        if(!closed&&id===sequence)emit('error',{code:e.code||'INFERENCE_FAILED'});
        throw e.code?e:error('INFERENCE_FAILED','사진 인식에 실패했습니다.',e);
      }
    };
    const pending=queue.then(task);queue=pending.catch(()=>{});return pending;
  }
  function cancelPending(){sequence++;}
  function dispose() {
    if(disposal)return disposal;
    closed=true;sequence++;
    disposal=(async()=>{
      await Promise.allSettled([queue,preparation]);
      await release();bytes=null;mapping=null;emit('disposed');
    })();return disposal;
  }
  return {prepare,recognize,cancelPending,dispose,getState:()=>({...state})};
}
