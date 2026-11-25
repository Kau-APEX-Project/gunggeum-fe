import { useEffect, useState } from 'react';
import { createCameraFeature } from '@/camera/deviceCompare/connect-example.mjs';
import { compareModels } from '@/camera/deviceCompare/compare.mjs';
import { releaseCameraForComparison, showComparisonPhoto, showComparisonCandidates } from '@/lib/cameraStore';
import '@/styles/cameraCompare.css';
import { useApp } from '@/context/AppContext';

let paintedId: string | null = null;
let currentId: string | null = null;
let pending: (() => void) | null = null;
export function acknowledgeComparisonPaint() { paintedId=currentId; pending?.(); }

export function CameraComparePanel() {
  const { cameraScreen }=useApp();
  const enabled=new URLSearchParams(location.search).get('cameraCompare')==='1';
  const [files,setFiles]=useState<File[]>([]);
  const [device,setDevice]=useState('');
  const [cache,setCache]=useState('unknown');
  const [reverse,setReverse]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('사진 선택 후 자동 비교');
  const [report,setReport]=useState<any>(null);
  const [controller,setController]=useState<AbortController|null>(null);
  useEffect(()=>{
    if(!enabled)return;
    document.body.classList.add('camera-comparison-mode');
    return()=>{document.body.classList.remove('camera-comparison-mode');};
  },[enabled]);
  useEffect(()=>()=>controller?.abort(),[controller]);
  useEffect(()=>{if(!cameraScreen)controller?.abort();},[cameraScreen,controller]);
  async function start(){
    if(busy||!files.length)return;
    const abort=new AbortController();setController(abort);setBusy(true);setReport(null);
    let hiddenCount=0;
    const visibility=()=>{hiddenCount++;};document.addEventListener('visibilitychange',visibility);
    const context={device:device||'unspecified',cache,href:location.origin+location.pathname,user_agent:navigator.userAgent,
      language:navigator.language,hardware_concurrency:navigator.hardwareConcurrency,secure_context:window.isSecureContext,
      viewport:{width:innerWidth,height:innerHeight,pixel_ratio:devicePixelRatio},hidden_at_start:document.hidden};
    try {
      await releaseCameraForComparison();
      const result=await compareModels({files,signal:abort.signal,context,order:reverse?['weightint8','weightfp16']:['weightfp16','weightint8'],
        onProgress:setStatus,present:(file:File)=>{currentId=null;paintedId=null;showComparisonPhoto(file);},
        createFeature:async(model:string)=>createCameraFeature({model,context,
          onCandidates:(candidates:any[],meta:any)=>{currentId=meta?.recordId??null;showComparisonCandidates(candidates);},
          onError:(code:string)=>setStatus(`오류 기록 중: ${code}`)}),
        waitForPaint:async(feature:any,id:string,signal:AbortSignal)=>{
          await new Promise<void>((resolve,reject)=>{
            const finish=(error?:string)=>{clearTimeout(timer);pending=null;signal.removeEventListener('abort',cancel);error?reject(Error(error)):resolve();};
            const cancel=()=>finish('CANCELLED');
            const timer=setTimeout(()=>finish('DISPLAY_TIMEOUT'),15000);
            pending=()=>{if(paintedId===id)finish();};
            signal.addEventListener('abort',cancel,{once:true});
            if(signal.aborted)cancel();else pending();
          });
          await new Promise<void>((resolve,reject)=>{
            const finish=(error?:string)=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);error?reject(Error(error)):resolve();};
            const cancel=()=>finish('CANCELLED');
            const timer=setTimeout(()=>finish('PAINT_TIMEOUT'),15000);
            signal.addEventListener('abort',cancel,{once:true});
            if(signal.aborted)cancel();else feature.markCandidatesRendered(id).then((ok:boolean)=>finish(ok?undefined:'PAINT_NOT_RECORDED'),(e:Error)=>finish(e.message));
          });
        }});
      result.context.visibility_changes=hiddenCount;setReport(result);
      setStatus(result.status==='complete'?'완료 · 결과 JSON 저장을 눌러 주세요':`${result.status} · 실패·중단 기록도 저장 가능`);
    }catch(e){setStatus(`측정 시작 실패: ${String(e)}`);}
    finally {document.removeEventListener('visibilitychange',visibility);pending=null;setBusy(false);}
  }
  async function save(){
    if(!report)return;
    const text=JSON.stringify(report,null,2),name=`camera_comparison_${Date.now()}.json`;
    const file=new File([text],name,{type:'application/json'});
    if(navigator.canShare?.({files:[file]})){
      try{await navigator.share({files:[file],title:'카메라 모델 비교 결과'});return;}catch(e){if((e as Error).name==='AbortError')return;}
    }
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  if(!enabled||!cameraScreen)return null;
  return <section className="camera-compare-panel" aria-label="개발용 모델 비교">
    <details open={!busy}><summary>개발용 모델 비교 · {status}</summary>
      <p>기존 후보 화면에서 두 모델을 순서대로 실행합니다. 화면을 켜 두세요.</p>
      <label>기기명 (선택) <input disabled={busy} placeholder="예: iPhone 15" value={device} onChange={e=>setDevice(e.target.value)}/></label>
      <label>방문 조건 <select disabled={busy} value={cache} onChange={e=>setCache(e.target.value)}><option value="unknown">모름</option><option value="first-visit-reported">첫 방문</option><option value="revisit-reported">재방문</option></select></label>
      <label>사진 선택 <input disabled={busy} type="file" multiple accept="image/*" onChange={e=>{setFiles(Array.from(e.target.files??[]));setReport(null);}}/></label>
      <label><input type="checkbox" disabled={busy} checked={reverse} onChange={e=>setReverse(e.target.checked)}/> INT8부터 비교 (재측정 시 순서 교대)</label>
    </details>
    <div className="camera-compare-actions">
      <button disabled={busy||!files.length} onClick={start}>두 모델 자동 비교 ({files.length}장)</button>
      {busy?<button onClick={()=>controller?.abort()}>중단</button>:<button disabled={!report} onClick={save}>결과 JSON 저장</button>}
    </div>
    {!busy&&report&&<small>JSON 1개를 전달해 주세요. 원본 사진은 포함되지 않습니다.</small>}
  </section>;
}
