import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { buildings } from "@/data/buildings";
import { useApp } from "@/context/AppContext";

export function Passport() {
  const { notify } = useApp();
  return <div className="screen-pad"><ScreenHeader title="Digital passport" /><div className="passport-head"><div><strong>4 <span>/ 12 visited</span></strong><p>Keep exploring the palace</p></div><Icon name="stamp" size={42} /></div><div className="stamp-grid">{buildings.map((b, i) => <div className={i < 4 ? "visited" : ""} key={b[0]}><span><Icon name="tour" size={24} /></span><strong>{b[0]}</strong><small>{i < 4 ? "VISITED" : "NOT VISITED"}</small></div>)}</div><Button secondary onClick={() => notify("Passport link copied (simulated).")}>Share passport</Button></div>;
}
