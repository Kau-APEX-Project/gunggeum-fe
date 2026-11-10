import { useEffect, useRef, useState } from "react";
import "@/styles/connect.css";
import { Icon } from "@/components/ui/Icon";
import { Proper } from "@/components/ui/Proper";
import { subtitles } from "@/data/subtitles";
import { useApp } from "@/context/AppContext";
import { fmt } from "@/lib/format";
import { SHOW_PROTOTYPE } from "@/lib/prototype";
import { leaveLive, retryLive, useLive } from "@/lib/liveStore";
import { AnswerText } from "@/screens/ask/AnswerText";

const STATUS_TEXT = { idle: "Connecting", checking: "Connecting", connecting: "Connecting", live: "Connected", reconnecting: "Reconnecting", failed: "Disconnected", ended: "Ended" } as const;
const LANG_NAME: Record<string, string> = { en: "English", th: "Thai" };

function clock(ts: number | null) {
  if (ts === null) return "";
  const d = new Date(ts < 1e12 ? ts * 1000 : ts); // 초 단위로 오면 밀리초로
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// T-31 실시간 자막. 서버에 연결된 세션이면 진짜 자막이 나옴
export function LiveSubtitles({ state }: { state?: "reconnect" | "mic" }) {
  const { setNoun, original, setOriginal, fontSize, setFontSize, subtitleCount, setSessionLive, liveSec, streamRef, go } = useApp();
  const live = useLive();
  const real = live.mode === "real";
  const realRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);                 // 맨 아래를 보고 있으면 새 자막에 따라 내려감
  const [hasNew, setHasNew] = useState(false); // 위로 올려 보는 중에 새 자막이 왔음
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { if (!real) return; const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, [real]);
  // 해설사가 세션을 끝내면 종료 화면(T-32)으로
  useEffect(() => { if (real && live.status === "ended") go("T-32", true); }, [real, live.status]);
  // 새 자막이 오면 아래로 (위로 올려 보는 중이면 "New subtitles" 버튼만)
  useEffect(() => {
    const el = realRef.current;
    if (!real || !el) return;
    if (stick.current) el.scrollTop = el.scrollHeight; else setHasNew(true);
  }, [real, live.items.length]);

  const onScroll = () => {
    const el = realRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (stick.current) setHasNew(false);
  };
  const jump = () => { const el = realRef.current; if (el) el.scrollTop = el.scrollHeight; stick.current = true; setHasNew(false); };
  const leave = () => { if (real || live.mode === "demo") leaveLive(); go("T-30"); };

  const reconnecting = state === "reconnect" || (real && ["reconnecting", "connecting", "checking"].includes(live.status));
  const micPaused = state === "mic" || (real && live.status === "live" && !live.micOn && live.items.length > 0);
  const badge = real ? STATUS_TEXT[live.status] : state === "reconnect" ? "Reconnecting" : "Connected";
  const title = real ? live.info?.title ?? "Live tour" : "Afternoon Palace Tour";
  const guide = real ? live.info?.guideName || "Guide" : "Guide Kim";
  const startedMs = real && live.info?.startedAt ? Date.parse(live.info.startedAt) : NaN;
  const elapsed = real ? (Number.isNaN(startedMs) ? 0 : Math.max(0, Math.floor((now - startedMs) / 1000))) : liveSec;
  const failText = live.failReason === "not_found" ? "We couldn't find this session. Check the code and try again."
    : live.failReason === "rate_limit" ? "Too many requests right now. Please try again in a moment."
    : "We couldn't connect to the live subtitles. Check your connection and try again.";

  return <div className="live-screen"><div className="live-header"><div className="live-top"><span className="live-label"><i /> LIVE</span><span className="official-badge"><Icon name="check" size={10} /> Official live tour</span><em className={reconnecting ? "reconnecting" : ""}>{badge}</em></div>
    <strong className="live-title">{title}</strong><div className="live-meta"><span>{guide}</span><span>{fmt(elapsed)}</span></div></div>
    {reconnecting && <div className="reconnect-bar">{real && live.status !== "reconnecting" ? "Connecting…" : "Reconnecting… subtitles will resume"}</div>}
    {micPaused && <div className="mic-paused"><Icon name="mic" size={18} />The guide's mic is paused</div>}
    {real && live.status === "failed" && <div className="live-failed" role="alert"><strong>{failText}</strong><div className="ask-actions"><button className="ask-btn" onClick={retryLive}>Try again</button><button className="ask-btn" onClick={leave}>Back to Live Tour</button></div></div>}
    {real ? <div className={`subtitle-stream ${reconnecting ? "dimmed" : ""}`} ref={realRef} onScroll={onScroll}>
      <div className="subtitle-intro">Live {LANG_NAME[live.lang] ?? "English"} subtitles<br /><small>Korean speech is translated automatically.</small></div>
      {live.items.length === 0 && live.status === "live" && <div className="listening"><i /><i /><i /> Waiting for the guide to start</div>}
      {live.items.map((item) => item.kind === "gap"
        ? <div className="gap-marker" key={`gap-${item.fromSeq}`}>⚠ Some subtitles were missed while reconnecting</div>
        : <div className="subtitle-block" key={item.seq} style={{ fontSize }}>
          <AnswerText text={item.text} onCard={(id) => setNoun(`card:${id}`)} />
          {original && item.textKo && <small>{item.textKo}</small>}{clock(item.ts) && <time>{clock(item.ts)}</time>}
        </div>)}
    </div> : <div className={`subtitle-stream ${state === "reconnect" ? "dimmed" : ""}`} ref={streamRef}>
      <div className="subtitle-intro">Live English subtitles<br /><small>Korean speech is translated automatically.</small></div>
      {subtitles.slice(0, subtitleCount).map((line, i) => <div className="subtitle-block" key={i} style={{ fontSize }}>
        {i === 2 ? <p>Behind the <Proper onClick={() => setNoun("Eojwa throne")}>Eojwa throne</Proper> is <Proper onClick={() => setNoun("Irworobongdo")}>Irworobongdo</Proper>, a painting of the sun, moon, and five peaks.</p> : i === 4 ? <p>Next, we will walk toward <Proper onClick={() => setNoun("Sajeongjeon")}>Sajeongjeon</Proper>, the king's working office.</p> : <p>{line.en}</p>}
        {original && <small>{line.ko}</small>}<time>{`12:${38 + i * 2}`}</time>
        {i === 2 && <div className="gap-marker">⚠ Some subtitles were missed while reconnecting</div>}
      </div>)}
      {subtitleCount < subtitles.length && <div className="listening"><i /><i /><i /> Listening</div>}
    </div>}
    {real && hasNew && <button className="new-subs" onClick={jump}>New subtitles ↓</button>}
    {SHOW_PROTOTYPE && !real && <button className="simulate" style={{ bottom: 72 }} onClick={() => { setSessionLive(false); go("T-32"); }}>Simulate: guide ends session</button>}
    <div className="subtitle-controls"><div><button onClick={() => setFontSize(Math.max(13, fontSize - 1))}>A−</button><button onClick={() => setFontSize(Math.min(21, fontSize + 1))}>A+</button></div><label><input type="checkbox" checked={original} onChange={(e) => setOriginal(e.target.checked)} /> Show original Korean</label><button onClick={leave}>Leave</button></div>
  </div>;
}
