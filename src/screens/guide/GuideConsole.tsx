import { useState } from "react";
import "@/styles/connect.css";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { endSession } from "@/lib/api";
import { ApiError, sessionErrorText } from "@/lib/apiTypes";
import { fmt } from "@/lib/format";
import { saveSummary, useGuideSession } from "@/lib/sessionStore";

// G-03 라이브 콘솔. 마이크·인식 문장·참여자 수는 아직 서버 WebSocket 연결 전이고
// "End session" 만 실제로 서버에 종료를 요청한다
export function GuideConsole() {
  const { micOn, setMicOn, setSessionLive, guideSec, go } = useApp();
  const session = useGuideSession();
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState("");
  // 언어는 영어·태국어만 (총 23명 예시)
  const dist: [string, number, string][] = [["English", 15, "var(--color-ink)"], ["Thai", 8, "var(--color-gray)"]];

  async function end() {
    setEnding(true);
    setEndError("");
    try {
      if (session) saveSummary(await endSession(session.code, session.guideToken)); // 세션 없이 시안으로 열었으면 서버 호출 없음
      setSessionLive(false);
      go("G-04");
    } catch (e) {
      setEndError(sessionErrorText(e instanceof ApiError ? e.kind : "network"));
    } finally {
      setEnding(false);
    }
  }

  return <div className="guide-screen console compact screen-pad"><div className="console-head"><div><span className="live-label"><i /> LIVE</span><h1>{session?.title ?? "Afternoon Palace Tour"}</h1></div><div className="head-right"><span className="timer-small">{fmt(guideSec)}</span><b>23 participants</b></div></div>
    <button className={`mic-button ${micOn ? "on" : ""}`} aria-label={micOn ? "Turn microphone off" : "Turn microphone on"} onClick={() => setMicOn(!micOn)}><Icon name="mic" size={42} /></button>
    <strong className="mic-status">{micOn ? "Microphone ON" : "Microphone OFF"}</strong>
    {micOn ? <small className="transcribing">Transcribing Korean</small> : <div className="mic-note">The guide's mic is paused.</div>}
    <div className="recognized"><span>LATEST RECOGNIZED KOREAN</span><p>{micOn ? "이곳은 왕이 신하들의 조회를 받던 근정전입니다." : "Waiting for microphone…"}</p></div>
    <div className="participant-card"><div><span>Language distribution</span><strong>23</strong></div><div className="language-bar"><i style={{ width: "65%", background: "var(--color-ink)" }} /><i style={{ width: "35%", background: "var(--color-gray)" }} /></div>
      {dist.map(([l, n, c]) => <div className="dist-row" key={l}><i style={{ background: c }} />{l}<b>{n}</b></div>)}</div>
    {endError && <p className="form-notice" role="alert">{endError}</p>}
    <div className="console-actions"><button className="secondary-action" onClick={() => go("G-02")}>Show QR again</button><button disabled={ending} onClick={end}>{ending ? "Ending…" : "End session"}</button></div></div>;
}
