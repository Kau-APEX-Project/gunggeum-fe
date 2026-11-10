import {preprocess} from './preprocess.mjs';
import {RecognitionError, validateMapping, formatResult} from './results.mjs';

export const MODEL_SHA256 = '9f957162755bc236f698c802aed820d76719cd4b5de7b3c0c3c0fc9d6bba47fe';

// One instance per app. Pass the same ORT instance used by the frontend.
export function createCameraRecognizer({ort, modelUrl, mappingUrl, wasmPaths,
  expectedHash=MODEL_SHA256, onState=()=>{},
  fetchImpl=globalThis.fetch, preprocessImage=preprocess,
  hasWebGPU=async()=>Boolean(await globalThis.navigator?.gpu?.requestAdapter()),
  maxBytes=20*1024*1024}) {
  let session=null, mapping=null, bytes=null, provider=null, preparation=null;
  let queue=Promise.resolve(), closed=false, disposal=null, sequence=0;
  let state={status:'idle', provider:null};
  const emit=(status, extra={})=>{state={status,provider,...extra};try{onState({...state});}catch{/* UI errors must not break inference. */}};
  const error=(code,message,cause)=>new RecognitionError(code,message,cause);
  const live=()=>{if(closed)throw error('DISPOSED','해제된 인식 모듈입니다.');};
  async function fetchOK(url) {
    const resource = String(url);
    const r=await fetchImpl(resource + (resource.includes('?')?'&':'?') + 'v='+MODEL_SHA256);
    if(!r.ok)throw error('DOWNLOAD_FAILED',`파일 요청 실패 (${r.status})`);
    return r;
  }
  async function release() {
    const old=session;session=null;provider=null;
    if(old)await old.release();
  }
  async function create(ep) {
    const next=await ort.InferenceSession.create(bytes,{executionProviders:[ep],graphOptimizationLevel:'all'});
    session=next;provider=ep;
  }
  async function initialize() {
    const start=performance.now();
    try {
      ort.env.wasm.numThreads=1;
      if(wasmPaths)ort.env.wasm.wasmPaths=wasmPaths;
      emit('downloading');
      mapping=await(await fetchOK(mappingUrl)).json();validateMapping(mapping,'field_expand_epoch12_weight_fp16');
      if(!bytes) {
        const candidate=await(await fetchOK(modelUrl)).arrayBuffer();
        const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',candidate)),v=>v.toString(16).padStart(2,'0')).join('');
        if(digest!==expectedHash)throw error('MODEL_MISMATCH','모델 파일 버전을 확인하세요.');
        bytes=candidate;
      }
      live();emit('initializing');
      try {
        if(!await hasWebGPU())throw error('WEBGPU_UNAVAILABLE','WebGPU를 사용할 수 없습니다.');
        await create('webgpu');
      } catch(e) {
        live();emit('fallback',{stage:'initialization',reason:String(e)});
        await create('wasm');
      }
      live();emit('ready',{preparation_ms:performance.now()-start});
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
  async function run(x) {
    let input,outputs;
    try {
      input=new ort.Tensor('float32',x,[1,3,320,320]);
      outputs=await session.run({image:input});
      if(!outputs.logits)throw error('INVALID_OUTPUT','모델 출력이 없습니다.');
      return formatResult(outputs.logits.data,mapping);
    } finally {
      input?.dispose?.();
      if(outputs)Object.values(outputs).forEach(t=>t.dispose?.());
    }
  }
  function recognize(file) {
    live();
    if(!(file instanceof Blob)||!file.size||file.size>maxBytes)
      return Promise.reject(error('INVALID_IMAGE','20MB 이하의 비어 있지 않은 사진을 선택하세요.'));
    const id=++sequence;
    const current=()=>{live();if(id!==sequence)throw error('SUPERSEDED','새 사진 요청으로 이전 결과를 취소했습니다.');};
    const task=async()=>{
      current();const start=performance.now();
      try {
        await prepare();current();emit('recognizing');
        const x=await preprocessImage(file);current();
        let result;
        try{result=await run(x);}catch(e){
          current();if(provider!=='webgpu')throw e;
          emit('fallback',{stage:'inference',reason:String(e)});
          await release();await create('wasm');current();result=await run(x);
        }
        current();const response={...result,request_id:id,provider,elapsed_ms:performance.now()-start};
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
