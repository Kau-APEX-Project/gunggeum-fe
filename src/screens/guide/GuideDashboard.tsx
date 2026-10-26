import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { GuideBrand } from "@/screens/guide/GuideBrand";
import type { ScreenId } from "@/types";
import { useApp } from "@/context/AppContext";

export function GuideDashboard() {
  const { setMicOn, setSessionLive, setGuideAuthed, go, startSession, back } = useApp();
  const upcoming = [["Afternoon Palace Tour", "Today · 14:00", "Scheduled", "0 joined"], ["Sunset Palace Tour", "Tomorrow · 16:00", "Scheduled", "0 joined"]];
  const recent = [["Morning Palace Tour", "Yesterday · 10:00", "Ended", "27 participants"], ["Royal Court Highlights", "Mon · 11:00", "Ended", "19 participants"]];
  const Card = ({ c, to }: { c: string[]; to: ScreenId }) => <button className="session-card" onClick={() => { if (to === "G-03") startSession(); go(to); }}><div><strong>{c[0]}</strong><small>{c[1]}</small></div><div className="card-meta"><em className={c[2] === "Scheduled" ? "scheduled" : ""}>{c[2]}</em><small>{c[3]}</small></div></button>;
  return <div className="guide-screen compact screen-pad"><div className="dash-head"><GuideBrand /><div className="avatar" aria-label="Guide Kim">K</div></div>
    <p className="welcome">Welcome back, <strong>Guide Kim</strong></p>
    <Button onClick={() => { setSessionLive(true); setMicOn(true); go("G-01"); }}><Icon name="mic" /> Create live session</Button>
    <h2 className="section-title">Upcoming sessions</h2>{upcoming.map((c) => <Card key={c[0]} c={c} to="G-03" />)}
    <h2 className="section-title">Recent sessions</h2>{recent.map((c) => <Card key={c[0]} c={c} to="G-04" />)}
    <div className="center-row"><button className="text-button" onClick={() => { setGuideAuthed(false); go("G-00"); }}>Log out</button></div>
  </div>;
}
