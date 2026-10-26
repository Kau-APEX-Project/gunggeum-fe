import { Icon } from "@/components/ui/Icon";
import { Proper } from "@/components/ui/Proper";
import { subtitles } from "@/data/subtitles";
import { fmt } from "@/lib/format";
import { useApp } from "@/context/AppContext";

export function LiveSubtitles({ state }: { state?: "reconnect" | "mic" }) {
  const { setNoun, original, setOriginal, fontSize, setFontSize, subtitleCount, setSessionLive, liveSec, streamRef, go } = useApp();
  return <div className="live-screen"><div className="live-header"><div className="live-top"><span className="live-label"><i /> LIVE</span><span className="official-badge"><Icon name="check" size={10} /> Official live tour</span><em className={state === "reconnect" ? "reconnecting" : ""}>{state === "reconnect" ? "Reconnecting" : "Connected"}</em></div>
    <strong className="live-title">Afternoon Palace Tour</strong><div className="live-meta"><span>Guide Kim</span><span>{fmt(liveSec)}</span></div></div>
    {state === "reconnect" && <div className="reconnect-bar">Reconnecting… subtitles will resume</div>}
    {state === "mic" && <div className="mic-paused"><Icon name="mic" size={18} />The guide's mic is paused</div>}
    <div className={`subtitle-stream ${state === "reconnect" ? "dimmed" : ""}`} ref={streamRef}>
      <div className="subtitle-intro">Live English subtitles<br /><small>Korean speech is translated automatically.</small></div>
      {subtitles.slice(0, subtitleCount).map((line, i) => <div className="subtitle-block" key={i} style={{ fontSize }}>
        {i === 2 ? <p>Behind the <Proper onClick={() => setNoun("Eojwa throne")}>Eojwa throne</Proper> is <Proper onClick={() => setNoun("Irworobongdo")}>Irworobongdo</Proper>, a painting of the sun, moon, and five peaks.</p> : i === 4 ? <p>Next, we will walk toward <Proper onClick={() => setNoun("Sajeongjeon")}>Sajeongjeon</Proper>, the king's working office.</p> : <p>{line.en}</p>}
        {original && <small>{line.ko}</small>}<time>{`12:${38 + i * 2}`}</time>
        {i === 2 && <div className="gap-marker">⚠ Some subtitles were missed while reconnecting</div>}
      </div>)}
      {subtitleCount < subtitles.length && <div className="listening"><i /><i /><i /> Listening</div>}
    </div>
    <button className="simulate" style={{ bottom: 72 }} onClick={() => { setSessionLive(false); go("T-32"); }}>Simulate: guide ends session</button>
    <div className="subtitle-controls"><div><button onClick={() => setFontSize(Math.max(13, fontSize - 1))}>A−</button><button onClick={() => setFontSize(Math.min(21, fontSize + 1))}>A+</button></div><label><input type="checkbox" checked={original} onChange={(e) => setOriginal(e.target.checked)} /> Show original Korean</label><button onClick={() => go("T-30")}>Leave</button></div>
  </div>;
}
