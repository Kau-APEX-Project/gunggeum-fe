import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";

export function RouteInput() {
  const { routeTime, setRouteTime, routeInterests, setRouteInterests, go } = useApp();
  return <div className="screen-pad"><ScreenHeader title="Recommend a route" /><p className="intro">We'll create a route that fits your visit.</p>
    <section className="form-section"><h2>How much time do you have?</h2><div className="chips">{["30 min", "60 min", "90+ min"].map((t) => <button key={t} className={routeTime === t ? "selected" : ""} onClick={() => setRouteTime(t)}>{t}</button>)}</div></section>
    <section className="form-section"><h2>What interests you?</h2><p>Choose all that apply</p><div className="chips wrap">{["Architecture", "Royal life", "Gardens", "History"].map((t) => <button key={t} className={routeInterests.includes(t) ? "selected" : ""} onClick={() => setRouteInterests(routeInterests.includes(t) ? routeInterests.filter((x) => x !== t) : [...routeInterests, t])}>{t}</button>)}</div></section>
    <div className="route-sketch"><Icon name="route" size={48} /><span>Your route will start from your current location.</span></div>
    <div className="bottom-buttons"><Button onClick={() => go("T-15")}>Create route</Button></div>
  </div>;
}
