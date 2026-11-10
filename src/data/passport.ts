// 디지털 여권에 사용하는 스탬프 목록(임시)
// id 는 pois.json 의 id 와 같아야 함

export const PASSPORT_PLACES: { id: string; en: string }[] = [
  { id: "place:gwanghwamun-gate", en: "Gwanghwamun" },
  { id: "place:heungnyemun-gate", en: "Heungnyemun" },
  { id: "place:geunjeongmun-gate", en: "Geunjeongmun" },
  { id: "place:geunjeongjeon-hall", en: "Geunjeongjeon" },
  { id: "place:seojeongjeon", en: "Sajeongjeon" },
  { id: "place:gangnyeongjeon", en: "Gangnyeongjeon" },
  { id: "place:gyotaejeon", en: "Gyotaejeon" },
  { id: "place:gyeonghoeru-pavilion", en: "Gyeonghoeru" },
  { id: "place:hyangwonjeong", en: "Hyangwonjeong" },
  { id: "place:p-25", en: "Geoncheonggung" },
  { id: "place:jagyeongjeon", en: "Jagyeongjeon" },
  { id: "place:sujeongjeon", en: "Sujeongjeon" },
];

export const PASSPORT_IDS = PASSPORT_PLACES.map((p) => p.id);
