import { Icon } from "@/components/ui/Icon";
import { MapView } from "@/screens/map/MapView";
import { useApp } from "@/context/AppContext";

export function MapHome({ state }: { state?: "offline" | "gps" | "arrival" }) {
  const { screen, audio, setAudio, setAudioPlaying, hanbokHidden, setHanbokHidden, servicesOpen, setServicesOpen, go } = useApp();
  return <div className="map-screen">
    {state === "offline" && <div className="state-banner"><strong>You're offline.</strong> Map, audio guide, and camera still work. Live Tour and Ask need a connection.</div>}
    {state === "gps" && <div className="state-banner"><strong>Location is uncertain — choose a building from the list</strong> Auto-play is paused.<button onClick={() => go("T-11")}>Choose from list</button></div>}
    {!state && <button className="notice-banner" onClick={() => go("T-50")}><span>NOTICE</span>Today 14:00 English tour cancelled due to rain <Icon name="chevron" size={15} /></button>}
    <div className="map-tools"><button onClick={() => go("T-11")}><Icon name="list" size={17} /> List</button>
      {!state && <button onClick={() => setServicesOpen(!servicesOpen)} aria-expanded={servicesOpen}><Icon name="compass" size={17} /> Services</button>}
      {!state && servicesOpen && <div className="services-menu"><button onClick={() => { setServicesOpen(false); go("T-60"); }}>Hanbok rental <Icon name="chevron" size={13} /></button></div>}</div>
    <MapView />
    {!state && screen === "T-10" && !hanbokHidden && <div className="hanbok-card"><div><strong>Experience Gyeongbokgung in hanbok</strong><small>Find nearby hanbok rentals</small><button className="hide-this" onClick={() => setHanbokHidden(true)}>Hide this</button></div><button className="card-cta" onClick={() => go("T-60")}>Hanbok rental</button></div>}
    <button className="route-fab" onClick={() => go("T-14")}><Icon name="route" size={18} /> Recommend a route</button>
    {state !== "gps" && <button className="simulate" onClick={() => go("T-13")}>Simulate arrival</button>}
    {(state === "arrival" || screen === "T-13") && <div className="arrival-toast"><Icon name="location" /><span>You've arrived at <strong>Geunjeongjeon</strong></span><button onClick={() => { setAudio(true); setAudioPlaying(true); go("T-12"); }}>Play guide <Icon name="play" size={14} /></button></div>}
  </div>;
}
