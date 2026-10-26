import { Icon } from "@/components/ui/Icon";
import { subtitles } from "@/data/subtitles";
import { useApp } from "@/context/AppContext";

export function LiveLobby() {
  const { sessionLive, openTour, setOpenTour, go } = useApp();
  const rows = [["10:00", "Morning Palace Tour", "Guide Park", "ended"], ["11:00", "Royal Court Highlights", "Guide Lee", "ended"], ["13:00", "Afternoon Palace Tour", "Guide Kim", sessionLive ? "live" : "ended"], ["14:00", "Throne Hall & Gardens", "Guide Choi", "upcoming"], ["15:00", "Palace Walk", "Guide Han", "upcoming"], ["16:00", "Sunset Palace Tour", "Guide Park", "upcoming"]];
  const label: Record<string, string> = { ended: "Ended", live: "Live now", upcoming: "Upcoming" };
  return <div className="screen-pad"><div className="live-hero"><Icon name="tour" size={38} /><h1>Live Tour</h1><p>Live Tour provides real-time interpretation for official Korean guided tours currently in progress.</p></div>
    <h2 className="section-title">Today's guided tours</h2><div className="schedule">
      {rows.map(([time, title, guide, status], i) => <div className="schedule-row" key={time}>
        <div className="schedule-main"><strong>{time}</strong><span><b>{title}</b><small>Korean tour · {guide}</small></span><em className={status === "live" ? "live" : ""}>{label[status]}</em></div>
        {status === "live" && <button className="row-action primary" onClick={() => go("T-31")}>Join live tour</button>}
        {status === "upcoming" && <button className="row-action" onClick={() => setOpenTour(openTour === i ? null : i)}>View tour</button>}
        {status === "ended" && <button className="row-action" disabled>Ended</button>}
        {openTour === i && <p className="tour-detail">Starts at {time} · led by {guide} in Korean. Live subtitles open when the guide starts the session — come back then and tap “Join live tour”.</p>}
      </div>)}
    </div>
    <div className="lobby-actions"><p className="availability-note">Live interpretation is available only during an active official guided tour.</p></div>
  </div>;
}
