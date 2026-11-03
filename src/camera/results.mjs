// Browser integration draft. Inject the team's onnxruntime-web instance.
export class RecognitionError extends Error {
  constructor(code, message, cause) { super(message, {cause}); this.name='RecognitionError'; this.code=code; }
}
export function validateMapping(mapping, modelVersion) {
  if(mapping.model_version!==modelVersion || !Array.isArray(mapping.classes) || mapping.classes.length!==60 ||
    mapping.classes.some((c,i)=>c.class_index!==i || typeof c.name_ko!=='string' ||
      (c.card_id!==null && (c.mapping_status!=='confirmed' || !/^b-\d+$/.test(c.card_id)))))
    throw new RecognitionError('INVALID_MAPPING','모델 버전·60개 클래스 순서·확정 카드 ID를 확인하세요.');
}
export function formatResult(logits, mapping) {
  if(logits.length!==mapping.classes.length || Array.from(logits).some(v=>!Number.isFinite(v)))
    throw new RecognitionError('INVALID_OUTPUT','모델 출력이 클래스 목록과 맞지 않습니다.');
  const max=Math.max(...logits), exp=Array.from(logits,v=>Math.exp(v-max)), sum=exp.reduce((a,b)=>a+b,0);
  const indices=Array.from(logits,(_,i)=>i).sort((a,b)=>logits[b]-logits[a] || a-b).slice(0,3);
  return {schema_version:'0.1',model_version:mapping.model_version,mapping_version:mapping.mapping_version,status:'ok',
    candidates:indices.map((i,r)=>({rank:r+1,class_index:i,name_ko:mapping.classes[i].name_ko,
      score:exp[i]/sum,card_id:mapping.classes[i].card_id,mapping_status:mapping.classes[i].mapping_status}))};
}
