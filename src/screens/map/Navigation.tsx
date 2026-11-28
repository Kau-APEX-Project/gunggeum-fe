import { useEffect } from "react";
import "@/styles/connect.css";
import { MapView } from "@/screens/map/MapView";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/lib/language";
import { advance, endNavigation, updatePosition, useNav } from "@/lib/navStore";
import { useVisit } from "@/lib/visitStore";

const meterText = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`);
const minText = (m: number) => `${Math.max(1, Math.round(m))} min`;

// T-16 길 안내. 코스나 한 곳이 정해져 있으면 진짜 경로를, 시안 목록에서 열었으면 예전 예시 문장을 보여 줌
export function Navigation() {
  const { go } = useApp();
  const lang = useLanguage();
  const nav = useNav();
  const visit = useVisit();
  const pos = visit.position;

  // 내 위치가 바뀔 때마다 알려 줌 (도착 판정과 경로 다시 계산)
  useEffect(() => { if (pos) updatePosition([pos.lng, pos.lat]); }, [pos?.lat, pos?.lng]);

  const exit = () => { endNavigation(); go("T-10"); };
  const step = nav.steps[nav.idx];
  const real = nav.status !== "idle";

  if (!real) {
    return <div className="navigation-screen"><MapView route /><div className="nav-card"><div className="turn-icon">↑</div><div><strong>Walk 120m to Sajeongjeon</strong><span>Continue straight past the courtyard</span></div></div>
      <div className="nav-bottom"><div><small>NEXT STOP · 2 OF 4</small><strong>Sajeongjeon</strong><span>3 min audio guide</span></div><button onClick={exit}>End</button></div>
    </div>;
  }

  const nameOf = (s: { name: { en: string; th: string } }) => (lang === "th" && s.name.th ? s.name.th : s.name.en);
  const fromGate = nav.plan?.fromGate;
  let title = "Finding your route…";
  let sub = fromGate ? "Starting from Gwanghwamun Gate" : "";
  if (nav.status === "error") { title = "We couldn't load the route"; sub = "Please check your connection and try again."; }
  else if (nav.status === "finished") { title = "You've completed the route"; sub = "Thank you for visiting Gyeongbokgung."; }
  else if (step && nav.leg) { title = `Walk ${meterText(nav.leg.meters)} to ${nameOf(step)}`; sub = `About ${minText(nav.leg.minutes)}${fromGate && nav.idx === 0 ? " · from Gwanghwamun Gate" : ""}`; }
  else if (step && nav.status === "active") { title = `Head to ${nameOf(step)}`; sub = "We couldn't find a walking path from here."; }

  const last = nav.idx === nav.steps.length - 1 && nav.steps.length > 1;
  return <div className="navigation-screen"><MapView route /><div className="nav-card"><div className="turn-icon">↑</div><div><strong>{title}</strong>{sub && <span>{sub}</span>}</div></div>
    <div className="nav-bottom">
      {step && nav.status === "active"
        ? <div><small>{last ? "FINAL STOP" : `NEXT STOP · ${nav.idx + 1} OF ${nav.steps.length}`}</small><strong>{nameOf(step)}</strong><span>{step.stayMin > 0 ? `About ${step.stayMin} min here` : "Walking guide"}</span></div>
        : <div><small>ROUTE</small><strong>{nav.status === "finished" ? "Finished" : "…"}</strong></div>}
      <span style={{ display: "flex", gap: 8 }}>
        {nav.status === "active" && nav.steps.length > 1 && <button onClick={advance}>Skip</button>}
        <button onClick={exit}>End</button>
      </span>
    </div>
  </div>;
}
