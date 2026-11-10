import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { USE_MOCK, fetchToursToday } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import type { TourRow } from "@/lib/liveProtocol";
import { joinLive, startDemo } from "@/lib/liveStore";
import "@/styles/connect.css";

// 시안(서버 연결 전)에서 보여 주는 예시 일정
const SAMPLE = (live: boolean): TourRow[] => [
  { time: "10:00", title: "Morning Palace Tour", guideName: "Guide Park", status: "ended", sessionCode: null },
  { time: "11:00", title: "Royal Court Highlights", guideName: "Guide Lee", status: "ended", sessionCode: null },
  { time: "13:00", title: "Afternoon Palace Tour", guideName: "Guide Kim", status: live ? "live" : "ended", sessionCode: null },
  { time: "14:00", title: "Throne Hall & Gardens", guideName: "Guide Choi", status: "upcoming", sessionCode: null },
  { time: "15:00", title: "Palace Walk", guideName: "Guide Han", status: "upcoming", sessionCode: null },
  { time: "16:00", title: "Sunset Palace Tour", guideName: "Guide Park", status: "upcoming", sessionCode: null },
];
const LABEL: Record<string, string> = { ended: "Ended", live: "Live now", upcoming: "Upcoming" };

export function LiveLobby() {
  const { sessionLive, openTour, setOpenTour, go } = useApp();
  const lang = useLanguage();
  const [tours, setTours] = useState<TourRow[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    let off = false;
    fetchToursToday().then((r) => { if (!off) setTours(r); }).catch(() => { if (!off) setLoadFailed(true); });
    return () => { off = true; };
  }, []);

  // 일정 목록: 서버가 연결되면 진짜 일정, 아니면 시안 예시
  const rows = tours ?? (USE_MOCK ? SAMPLE(sessionLive) : []);

  async function join(rawCode: string) {
    setJoining(true);
    setJoinError("");
    const result = await joinLive(rawCode, lang);
    setJoining(false);
    if (result === "ok") go("T-31");
    else if (result === "ended") go("T-32");
    else setJoinError(result === "not_found" ? "We couldn't find that session. Check the code and try again."
      : result === "rate_limit" ? "Too many requests right now. Please try again in a moment."
      : "We couldn't reach the server. Please try again.");
  }

  return <div className="screen-pad"><div className="live-hero"><Icon name="tour" size={38} /><h1>Live Tour</h1><p>Live Tour provides real-time interpretation for official Korean guided tours currently in progress.</p></div>
    <h2 className="section-title">Today's guided tours</h2><div className="schedule">
      {!USE_MOCK && tours === null && !loadFailed && <p className="lobby-note" role="status">Loading today's tours…</p>}
      {loadFailed && <p className="lobby-note" role="alert">We couldn't load today's tours. You can still join with a session code below.</p>}
      {tours !== null && tours.length === 0 && <p className="lobby-note">No guided tours are scheduled today.</p>}
      {rows.map((row, i) => <div className="schedule-row" key={`${row.time}-${i}`}>
        <div className="schedule-main"><strong>{row.time}</strong><span><b>{row.title}</b><small>Korean tour{row.guideName ? ` · ${row.guideName}` : ""}</small></span><em className={row.status === "live" ? "live" : ""}>{LABEL[row.status]}</em></div>
        {row.status === "live" && <button className="row-action primary" disabled={joining} onClick={() => (row.sessionCode ? join(row.sessionCode) : (startDemo(), go("T-31")))}>Join live tour</button>}
        {row.status === "upcoming" && <button className="row-action" onClick={() => setOpenTour(openTour === i ? null : i)}>View tour</button>}
        {row.status === "ended" && <button className="row-action" disabled>Ended</button>}
        {openTour === i && <p className="tour-detail">Starts at {row.time}{row.guideName ? ` · led by ${row.guideName}` : ""} in Korean. Live subtitles open when the guide starts the session — come back then and tap “Join live tour”.</p>}
      </div>)}
    </div>
    <div className="lobby-actions"><Button onClick={() => setShowCode(!showCode)}><Icon name="camera" /> Scan session QR</Button>
      {showCode && <div className="code-entry"><p>Scan the guide's QR code with your phone's camera app. It opens this page and joins automatically. Or enter the session code:</p>
        <div className="code-row"><input value={code} maxLength={12} placeholder="GB-1042" aria-label="Session code" onChange={(e) => { setCode(e.target.value); setJoinError(""); }} /><button disabled={!code.trim() || joining} onClick={() => join(code)}>{joining ? "Joining…" : "Join"}</button></div>
        {joinError && <p className="field-error" role="alert">{joinError}</p>}</div>}
      <Button secondary onClick={() => { startDemo(); go("T-31"); }}>Join demo session</Button><p className="availability-note">Live interpretation is available only during an active official guided tour.</p></div>
  </div>;
}
