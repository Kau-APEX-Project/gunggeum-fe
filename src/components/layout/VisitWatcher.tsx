import { useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { usePlaces } from "@/data/places";
import { PASSPORT_IDS } from "@/data/passport";
import { onVisitEvent, representative } from "@/lib/visitStore";

//  - 도착(audio): 지도 홈(T-10)에 있으면 도착 알림 화면(T-13)으로, 다른 화면이면 안내 문구
//  - 스탬프(stamp): 여권 12곳 중 하나면 "Stamp collected" 안내 문구
export function VisitWatcher() {
  const { screen, go, notify } = useApp();
  const { places } = usePlaces();
  const ref = useRef({ screen, go, notify, places });
  ref.current = { screen, go, notify, places };

  useEffect(() => onVisitEvent((e) => {
    const { screen, go, notify, places } = ref.current;
    const name = representative(places, e.poiId)?.en ?? "this building";
    if (e.type === "audio") {
      if (screen === "T-10") go("T-13");
      else notify(`You've arrived at ${name}`);
    }
    if (e.type === "stamp" && PASSPORT_IDS.includes(e.poiId)) notify(`Stamp collected: ${name}`);
  }), []);

  return null;
}
