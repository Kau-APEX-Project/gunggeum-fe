import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { buildings } from "@/data/buildings";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/lib/language";
import { startNavigation, useNav } from "@/lib/navStore";
import { AnswerText } from "@/screens/ask/AnswerText";

const REASON: Record<string, string> = { time: "not enough time", path: "no walking path", unknown: "not available" };

// T-15 추천 경로 결과. 코스를 만들어 왔으면 진짜 결과를, 시안 목록에서 열었으면 예전 예시를 보여 줌
export function RouteResult() {
  const { go, setNoun } = useApp();
  const lang = useLanguage();
  const { plan } = useNav();

  if (!plan) {
    const stops = ["Geunjeongjeon", "Sajeongjeon", "Gyeonghoeru", "Hyangwonjeong"];
    return <div className="screen-pad"><ScreenHeader title="Your palace route" /><div className="route-summary"><strong>4 stops</strong><span>About 58 min · 1.4 km</span></div>
      <div className="stop-list">{stops.map((stop, i) => <div className="stop" key={stop}><div className="stop-number">{i + 1}</div><div><strong>{stop}</strong><small>{buildings.find((b) => b[0] === stop)?.[3]} · {buildings.find((b) => b[0] === stop)?.[4]} audio</small></div>{i < stops.length - 1 && <span className="walk">····· {4 + i * 2} min walk</span>}</div>)}</div>
      <div className="bottom-buttons"><Button onClick={() => go("T-16")}><Icon name="route" /> Start navigation</Button></div>
    </div>;
  }

  const nameOf = (s: { name: { en: string; th: string } }) => (lang === "th" && s.name.th ? s.name.th : s.name.en);
  const empty = plan.stops.length === 0;
  return <div className="screen-pad"><ScreenHeader title="Your palace route" />
    <div className="route-summary"><strong>{plan.stops.length} {plan.stops.length === 1 ? "stop" : "stops"}</strong><span>About {Math.round(plan.minutes)} min · {(plan.meters / 1000).toFixed(1)} km</span></div>
    {plan.fromGate && <p className="intro">We couldn't find your position inside the palace, so this route starts and ends at Gwanghwamun Gate.</p>}
    <div className="bot-copy" style={{ margin: "14px 0" }}><AnswerText text={plan.answer} onCard={(id) => setNoun(`card:${id}`)} /></div>
    {empty ? <p className="form-notice" role="alert">We couldn't fit any stops into {plan.limitMin} minutes. Try a longer time.</p>
      : <div className="stop-list">{plan.stops.map((stop, i) => <div className="stop" key={stop.id}><div className="stop-number">{i + 1}</div><div><strong>{nameOf(stop)}</strong><small>About {stop.stayMin} min here</small></div>{i < plan.stops.length - 1 && <span className="walk">····· {Math.max(1, Math.round(plan.stops[i + 1].walkMin))} min walk</span>}</div>)}</div>}
    {plan.dropped.length > 0 && !empty && <p className="intro">{plan.dropped.length} {plan.dropped.length === 1 ? "stop was" : "stops were"} left out to fit your time ({plan.dropped.map((d) => `${d.name}: ${REASON[d.reason]}`).join(", ")}).</p>}
    <div className="bottom-buttons">{empty
      ? <Button onClick={() => go("T-14")}>Change my request</Button>
      : <Button onClick={() => { void startNavigation(); go("T-16"); }}><Icon name="route" /> Start navigation</Button>}</div>
  </div>;
}
