import { useEffect, useState } from "react";
import "@/styles/connect.css";
import { Icon } from "@/components/ui/Icon";
import { usePlaces } from "@/data/places";
import { useApp } from "@/context/AppContext";
import { USE_MOCK, endSession } from "@/lib/api";
import { ApiError, sessionErrorText } from "@/lib/apiTypes";
import { fmt } from "@/lib/format";
import { SHOW_PROTOTYPE } from "@/lib/prototype";
import { leaveGuide, retryGuide, setGuideLocation, setGuideMic, startGuide, useGuide, type MicState } from "@/lib/guideStore";
import { saveSummary, useGuideSession } from "@/lib/sessionStore";

const LANG_NAMES: Record<string, string> = { en: "English", th: "Thai", ko: "Korean" };
const BAR_COLORS = ["var(--color-ink)", "var(--color-gray)", "var(--color-line)"];
const MIC_TEXT: Record<MicState, string> = {
  off: "Microphone OFF", starting: "Starting microphone…", on: "Microphone ON", denied: "Microphone access is blocked",
  insecure: "Microphone needs a secure (HTTPS) connection", error: "Couldn't start the microphone",
};

// G-03 라이브 콘솔. 서버에 연결된 세션이면 진짜 마이크·참여자 수·인식 문장을 쓰고,
// 서버가 연결되지 않은(가짜 서버) 상태나 시안 목록에서 열었으면 예전 시늉 화면을 그대로 보여 줌
export function GuideConsole() {
  const { micOn, setMicOn, setSessionLive, guideSec, go } = useApp();
  const session = useGuideSession();
  const guide = useGuide();
  const real = !USE_MOCK && !!session;
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const { places } = usePlaces();
  // 위치 선택 목록은 대표 전각(자기 자신이 권역 대표)만, 번호 순으로 보임
  const placeOptions = places.filter((p) => p.group === p.ko).sort((a, b) => a.serial - b.serial);
  const sentPlace = places.find((p) => p.id === guide.location);

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

  const manual = guide.locationMode === "manual";
  const pickLocation = (value: string) => setGuideLocation(value === "" ? null : value); // "" = 자동(GPS)으로 되돌림
  const closeEnded = () => { leaveGuide(); setSessionLive(false); go("G-01"); }; // 서버가 이미 끝낸 세션을 정리하고 처음으로

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
    {real && guide.status === "ended" && <div className="form-notice" role="alert">This session has already ended. <button className="ask-btn" onClick={closeEnded}>Back to start</button></div>}
    {real && guide.status === "unauthorized" && <div className="form-notice" role="alert">The guide access was rejected. Create a new session and try again. <button className="ask-btn" onClick={closeEnded}>Back to start</button></div>}
    {real && guide.sttError && <div className="form-notice" role="alert">{guide.sttError}</div>}
    <div className="recognized"><span>LATEST RECOGNIZED KOREAN</span><p>{recognized}</p></div>
    {real && <div className="participant-card"><div><span>Current location</span><strong>{sentPlace ? sentPlace.en : "Not sent yet"}</strong></div>
      {SHOW_PROTOTYPE && <>
      <select aria-label="Choose current location" value={manual ? guide.location ?? "" : ""} onChange={(e) => pickLocation(e.target.value)} style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 8, border: "1px solid var(--color-line)", background: "transparent", color: "inherit", font: "inherit" }}>
        <option value="">Auto (GPS)</option>
        {placeOptions.map((p) => <option key={p.id} value={p.id}>{p.en} · {p.ko}</option>)}
      </select>
      <small>{manual ? "Fixed manually. Choose Auto (GPS) to follow your position again." : "Updates automatically when GPS detects a new place."}</small></>}</div>}
    <div className="participant-card"><div><span>Language distribution</span><strong>{participants}</strong></div><div className="language-bar">{dist.map(([l, n, c]) => <i key={l} style={{ width: `${(n / total) * 100}%`, background: c }} />)}</div>
      {dist.map(([l, n, c]) => <div className="dist-row" key={l}><i style={{ background: c }} />{l}<b>{n}</b></div>)}</div>
    {endError && <p className="form-notice" role="alert">{endError}</p>}
    <div className="console-actions"><button className="secondary-action" onClick={() => go("G-02")}>Show QR again</button><button disabled={ending} onClick={end}>{ending ? "Ending…" : "End session"}</button></div></div>;
}
