import { Icon } from "@/components/ui/Icon";
import { fmt } from "@/lib/format";
import { useApp } from "@/context/AppContext";

export function GuideConsole() {
  const { micOn, setMicOn, setSessionLive, guideSec, go } = useApp();
  const dist: [string, number, string][] = [["English", 15, "#333"], ["Vietnamese", 5, "#9e9e9e"], ["Thai", 3, "#d9d9d9"]];
  return <div className="guide-screen console compact screen-pad"><div className="console-head"><div><span className="live-label"><i /> LIVE</span><h1>Afternoon Palace Tour</h1></div><div className="head-right"><span className="timer-small">{fmt(guideSec)}</span><b>23 participants</b></div></div>
    <button className={`mic-button ${micOn ? "on" : ""}`} aria-label={micOn ? "Turn microphone off" : "Turn microphone on"} onClick={() => setMicOn(!micOn)}><Icon name="mic" size={42} /></button>
    <strong className="mic-status">{micOn ? "Microphone ON" : "Microphone OFF"}</strong>
    {micOn ? <small className="transcribing">Transcribing Korean</small> : <div className="mic-note">The guide's mic is paused.</div>}
    <div className="recognized"><span>LATEST RECOGNIZED KOREAN</span><p>{micOn ? "이곳은 왕이 신하들의 조회를 받던 근정전입니다." : "Waiting for microphone…"}</p></div>
    <div className="participant-card"><div><span>Language distribution</span><strong>23</strong></div><div className="language-bar"><i style={{ width: "65%" }} /><i style={{ width: "22%" }} /><i style={{ width: "13%" }} /></div>
      {dist.map(([l, n, c]) => <div className="dist-row" key={l}><i style={{ background: c }} />{l}<b>{n}</b></div>)}</div>
    <div className="console-actions"><button onClick={() => { setSessionLive(false); go("G-04"); }}>End session</button></div></div>;
}
