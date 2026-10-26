import { MapView } from "@/screens/map/MapView";
import { useApp } from "@/context/AppContext";

export function Navigation() {
  const { go } = useApp();
  return <div className="navigation-screen"><MapView route /><div className="nav-card"><div className="turn-icon">↑</div><div><strong>Walk 120m to Sajeongjeon</strong><span>Continue straight past the courtyard</span></div></div>
    <div className="nav-bottom"><div><small>NEXT STOP · 2 OF 4</small><strong>Sajeongjeon</strong><span>3 min audio guide</span></div><button onClick={() => go("T-10")}>End</button></div>
  </div>;
}
