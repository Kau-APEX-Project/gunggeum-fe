import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { MapView } from "@/screens/map/MapView";
import { useApp } from "@/context/AppContext";
import { usePlaces } from "@/data/places";
import { SHOW_PROTOTYPE } from "@/lib/prototype";
import { clearArrival, ensureVisitTracking, representative, useVisit } from "@/lib/visitStore";
import { NoticeBanner } from "@/components/layout/NoticeBanner";

export function MapHome({ state }: { state?: "offline" | "gps" | "arrival" }) {
  const { screen, audio, setAudio, setAudioPlaying, hanbokHidden, setHanbokHidden, servicesOpen, setServicesOpen, go, goToPlace } = useApp();
  const { places } = usePlaces();
  const visit = useVisit();
  // 이미 위치 허용을 해 둔 사람은 지도 홈에 들어올 때 방문 판정을 자동으로 시작
  useEffect(() => { ensureVisitTracking(); }, []);
  const weak = !state && visit.tracking === "on" && visit.weakGps; // 실제 위치 정확도가 계속 나쁠 때 (S-03)
  const arrived = visit.arrival ? representative(places, visit.arrival.poiId) : undefined; // 방금 도착한 장소의 대표 (없으면 시안 예시)
  const play = () => { setAudio(true); setAudioPlaying(true); if (arrived) goToPlace(arrived.id); else go("T-12"); clearArrival(); };
  return <div className="map-screen">
    {state === "offline" && <div className="state-banner"><strong>You're offline.</strong> Map, audio guide, and camera still work. Live Tour and Ask need a connection.</div>}
    {(state === "gps" || weak) && <div className="state-banner"><strong>Location is uncertain — choose a building from the list</strong> Auto-play is paused.<button onClick={() => go("T-11")}>Choose from list</button></div>}
    {!state && !weak && <NoticeBanner />}
    <div className="map-tools"><button onClick={() => go("T-11")}><Icon name="list" size={17} /> List</button>
      {!state && <button onClick={() => setServicesOpen(!servicesOpen)} aria-expanded={servicesOpen}><Icon name="compass" size={17} /> Services</button>}
      {!state && servicesOpen && <div className="services-menu"><button onClick={() => { setServicesOpen(false); go("T-60"); }}>Hanbok rental <Icon name="chevron" size={13} /></button></div>}</div>
    <MapView />
    {!state && screen === "T-10" && !hanbokHidden && <div className="hanbok-card"><div><strong>Experience Gyeongbokgung in hanbok</strong><small>Find nearby hanbok rentals</small><button className="hide-this" onClick={() => setHanbokHidden(true)}>Hide this</button></div><button className="card-cta" onClick={() => go("T-60")}>Hanbok rental</button></div>}
    <button className="route-fab" onClick={() => go("T-14")}><Icon name="route" size={18} /> Recommend a route</button>
    {SHOW_PROTOTYPE && state !== "gps" && <button className="simulate" onClick={() => go("T-13")}>Simulate arrival</button>}
    {(state === "arrival" || screen === "T-13") && <div className="arrival-toast"><Icon name="location" /><span>You've arrived at <strong>{arrived?.en ?? "Geunjeongjeon"}</strong></span><button onClick={play}>Play guide <Icon name="play" size={14} /></button></div>}
  </div>;
}
