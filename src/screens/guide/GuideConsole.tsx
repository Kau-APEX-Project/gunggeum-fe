import { useEffect, useState } from "react";
import "@/styles/connect.css";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { USE_MOCK, endSession } from "@/lib/api";
import { ApiError, sessionErrorText } from "@/lib/apiTypes";
import { fmt } from "@/lib/format";
import { leaveGuide, retryGuide, setGuideMic, startGuide, useGuide, type MicState } from "@/lib/guideStore";
import { saveSummary, useGuideSession } from "@/lib/sessionStore";

const LANG_NAMES: Record<string, string> = { en: "English", th: "Thai", ko: "Korean" };
const BAR_COLORS = ["var(--color-ink)", "var(--color-gray)", "var(--color-line)"];
const MIC_TEXT: Record<MicState, string> = {
  off: "Microphone OFF", starting: "Starting microphone…", on: "Microphone ON", denied: "Microphone access is blocked",
  insecure: "Microphone needs a secure (HTTPS) connection", error: "Couldn't start the microphone",
};

// G-03 라이브 콘솔. 서버에 연결된 세션이면 진짜 마이크·참여자 수·인식 문장을 쓰고
// 서버가 연결되지 않은(가짜 서버) 상태나 시안 목록에서 열었으면 예전 가짜 화면을 보여줌
export function GuideConsole() {
  const { micOn, setMicOn, setSessionLive, guideSec, go } = useApp();
  const session = useGuideSession();
  const guide = useGuide();
  const real = !USE_MOCK && !!session;
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // 콘솔에 들어오면 해설사 WebSocket 에 연결 (이미 연결돼 있으면 그대로)
  useEffect(() => { if (real && session) startGuide(session.code, session.guideToken); }, [real, session?.code]);
  useEffect(() => { if (!real) return; const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, [real]);

  const on = real ? guide.micState === "on" : micOn;
  const toggleMic = () => (real ? setGuideMic(!(guide.micState === "on" || guide.micState === "starting")) : setMicOn(!micOn));
  const startedMs = real && session ? Date.parse(session.startedAt) : NaN;
  const elapsed = real ? (Number.isNaN(startedMs) ? 0 : Math.max(0, Math.floor((now - startedMs) / 1000))) : guideSec;
  const participants = real ? guide.participants : 23;
  const dist: [string, number, string][] = real
    ? Object.entries(guide.languages as Record<string, number>).map(([l, n], i) => [LANG_NAMES[l] ?? l.toUpperCase(), n, BAR_COLORS[i % BAR_COLORS.length]])
    : [["English", 15, BAR_COLORS[0]], ["Thai", 8, BAR_COLORS[1]]];
  const total = dist.reduce((sum, d) => sum + d[1], 0) || 1;
  const micText = real ? MIC_TEXT[guide.micState] : on ? "Microphone ON" : "Microphone OFF";
  const recognized = real ? guide.transcript || (on ? "Listening…" : "Waiting for microphone…") : on ? "이곳은 왕이 신하들의 조회를 받던 근정전입니다." : "Waiting for microphone…";

  async function end() {
    setEnding(true);
    setEndError("");
    try {
      if (session) saveSummary(await endSession(session.code, session.guideToken)); // 세션 없이 시안으로 열었으면 서버 호출 없음
      leaveGuide();                                                                    // 마이크를 끄고 연결을 닫음
      setSessionLive(false);
      go("G-04");
    } catch (e) {
      setEndError(sessionErrorText(e instanceof ApiError ? e.kind : "network"));
    } finally {
      setEnding(false);
    }
  }

  return <div className="guide-screen console compact screen-pad"><div className="console-head"><div><span className="live-label"><i /> LIVE</span><h1>{session?.title ?? "Afternoon Palace Tour"}</h1></div><div className="head-right"><span className="timer-small">{fmt(elapsed)}</span><b>{participants} participants</b></div></div>
    <button className={`mic-button ${on ? "on" : ""}`} aria-label={on ? "Turn microphone off" : "Turn microphone on"} onClick={toggleMic}><Icon name="mic" size={42} /></button>
    <strong className="mic-status">{micText}</strong>
    {on ? <small className="transcribing">Transcribing Korean</small> : <div className="mic-note">{real && guide.micState === "denied" ? "Allow microphone access in your browser settings, then tap the mic again." : "The guide's mic is paused."}</div>}
    {real && (guide.status === "reconnecting" || guide.status === "connecting") && <div className="mic-note" role="status">{guide.status === "connecting" ? "Connecting to the server…" : "Reconnecting… your microphone is paused until it reconnects"}</div>}
    {real && guide.status === "failed" && <div className="form-notice" role="alert">We couldn't connect to the server. <button className="ask-btn" onClick={retryGuide}>Try again</button></div>}
    {real && guide.sttError && <div className="form-notice" role="alert">{guide.sttError}</div>}
    <div className="recognized"><span>LATEST RECOGNIZED KOREAN</span><p>{recognized}</p></div>
    <div className="participant-card"><div><span>Language distribution</span><strong>{participants}</strong></div><div className="language-bar">{dist.map(([l, n, c]) => <i key={l} style={{ width: `${(n / total) * 100}%`, background: c }} />)}</div>
      {dist.map(([l, n, c]) => <div className="dist-row" key={l}><i style={{ background: c }} />{l}<b>{n}</b></div>)}</div>
    {endError && <p className="form-notice" role="alert">{endError}</p>}
    <div className="console-actions"><button className="secondary-action" onClick={() => go("G-02")}>Show QR again</button><button disabled={ending} onClick={end}>{ending ? "Ending…" : "End session"}</button></div></div>;
}
