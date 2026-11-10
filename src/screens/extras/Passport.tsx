import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PASSPORT_PLACES } from "@/data/passport";
import { useApp } from "@/context/AppContext";
import { useVisit } from "@/lib/visitStore";

// 디지털 여권: 12곳 중 GPS 방문 판정으로 스탬프를 받은 곳이 "VISITED" 로 바뀜
export function Passport() {
  const { notify } = useApp();
  const { visited } = useVisit();
  const done = PASSPORT_PLACES.filter((p) => visited.includes(p.id)).length;
  return <div className="screen-pad"><ScreenHeader title="Digital passport" /><div className="passport-head"><div><strong>{done} <span>/ {PASSPORT_PLACES.length} visited</span></strong><p>Keep exploring the palace</p></div><Icon name="stamp" size={42} /></div><div className="stamp-grid">{PASSPORT_PLACES.map((p) => { const v = visited.includes(p.id); return <div className={v ? "visited" : ""} key={p.id}><span><Icon name="tour" size={24} /></span><strong>{p.en}</strong><small>{v ? "VISITED" : "NOT VISITED"}</small></div>; })}</div><Button secondary onClick={() => notify("Passport link copied (simulated).")}>Share passport</Button></div>;
}
