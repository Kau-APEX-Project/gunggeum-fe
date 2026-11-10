import {createCameraRecognizer, MODEL_SHA256} from './camera.mjs';

// Call once for the app and reuse the returned controller.
// onOpenBuilding must connect to the existing frontend selection/navigation function.
export async function createCameraFeature({onState, onCandidates, onOpenBuilding, onError}) {
  const base = new URL(`${import.meta.env.BASE_URL}camera/`, window.location.origin);
  const ort = await import(/* @vite-ignore */ new URL('ort/ort.webgpu.min.mjs', base).href);
  const response = await fetch(new URL('class_mapping.json?v='+MODEL_SHA256, base));
  if (!response.ok) throw new Error('Class mapping download failed');
  const mapping = await response.json();
  let latest = null;
  const camera = createCameraRecognizer({ort,
    modelUrl:new URL('model.onnx',base).href,
    mappingUrl:new URL('class_mapping.json',base).href,
    wasmPaths:new URL('ort/',base).href,onState});
  const showError = e => {if(!['SUPERSEDED','DISPOSED'].includes(e.code))onError(e.code||'ERROR',e.message);};
  return {
    async enter(){try{await camera.prepare();}catch(e){showError(e);}},
    async selectPhoto(file){
      latest=null;onCandidates([]);
      try{latest=await camera.recognize(file);onCandidates(latest.candidates);}
      catch(e){showError(e);}
    },
    choose(candidate){
      if(!latest?.candidates.includes(candidate))return; // ignore a stale UI candidate
      const place=mapping.classes[candidate.class_index];
      if(!place || place.card_id!==candidate.card_id || place.mapping_status!=='confirmed'){
        onError('UNMAPPED_CARD','전각 연결 정보를 확인하세요.');return;
      }
      onOpenBuilding({cardId:place.card_id,poiId:place.poi_id,serial:place.building_serial});
    },
    leave(){latest=null;camera.cancelPending();onCandidates([]);},
    destroy(){latest=null;return camera.dispose();}
  };
}
