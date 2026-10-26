import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { buildings } from "@/data/buildings";
import { useApp } from "@/context/AppContext";

export function RouteResult() {
  const { go } = useApp();
  const stops = ["Geunjeongjeon", "Sajeongjeon", "Gyeonghoeru", "Hyangwonjeong"];
  return <div className="screen-pad"><ScreenHeader title="Your palace route" /><div className="route-summary"><strong>4 stops</strong><span>About 58 min · 1.4 km</span></div>
    <div className="stop-list">{stops.map((stop, i) => <div className="stop" key={stop}><div className="stop-number">{i + 1}</div><div><strong>{stop}</strong><small>{buildings.find((b) => b[0] === stop)?.[3]} · {buildings.find((b) => b[0] === stop)?.[4]} audio</small></div>{i < stops.length - 1 && <span className="walk">····· {4 + i * 2} min walk</span>}</div>)}</div>
    <div className="bottom-buttons"><Button onClick={() => go("T-16")}><Icon name="route" /> Start navigation</Button></div>
  </div>;
}
