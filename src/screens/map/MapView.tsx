import { useApp } from "@/context/AppContext";

export function MapView({ route = false }: { route?: boolean }) {
  const { go } = useApp();
  const pins = [["Gwanghwamun", 48, 86], ["Geunjeongjeon", 47, 62], ["Gyeonghoeru", 23, 50], ["Sajeongjeon", 52, 43], ["Hyangwonjeong", 63, 17], ["Museum", 82, 29]];
  return <div className="map-placeholder">
    <div className="map-roads" />
    {route && <svg className="route-line" viewBox="0 0 300 420"><path d="M145 355 C110 280,210 245,150 180 S190 80 190 55" /></svg>}
    {pins.map(([name, left, top], i) => <button key={String(name)} className="map-pin" style={{ left: `${left}%`, top: `${top}%` }} onClick={() => go("T-12")}><span>{i + 1}</span><small>{name}</small></button>)}
    <div className="user-dot" style={{ left: "56%", top: "76%" }} />
  </div>;
}
