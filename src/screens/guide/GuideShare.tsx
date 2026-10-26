import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { QrCode } from "@/components/ui/QrCode";
import { GuideBrand } from "@/screens/guide/GuideBrand";
import { useApp } from "@/context/AppContext";

export function GuideShare() {
  const { sessionCode, joined, go, startSession, notify } = useApp();
  const joinUrl = `gunggeum.app/join/${sessionCode}`;
  const copy = (text: string, msg: string) => { navigator.clipboard?.writeText(text).catch(() => {}); notify(msg); };
  return <div className="guide-screen share compact screen-pad"><GuideBrand />
    <div className="share-step"><span>STEP 2 / 3</span><div className="steps"><i className="done" /><i className="on" /><i /></div></div>
    <h1>Share session</h1><p>Ask tourists to scan the QR code or enter the session code in the Live Tour lobby.</p>
    <div className="share-card">
      <div className="share-title"><strong>Afternoon Palace Tour</strong><span className="status-chip">READY</span></div>
      <div className="share-qr"><QrCode seed={sessionCode} size={196} label="Session QR" /></div>
      <span className="share-label">SESSION CODE</span>
      <div className="code-cells" role="text" aria-label={`Session code ${sessionCode.split("").join(" ")}`}>{sessionCode.split("").map((c, i) => <b key={i}>{c}</b>)}</div>
      <div className="share-actions">
        <button onClick={() => copy(sessionCode, "Session code copied")}>Copy code</button>
        <button onClick={() => copy(joinUrl, "Join link copied")}>Copy link</button>
      </div>
    </div>
    <div className="join-status" role="status"><span><i /> Waiting for tourists</span><b>{joined} joined</b></div>
    <div className="flow-buttons"><Button onClick={() => { startSession(); go("G-03"); }}><Icon name="mic" /> Start session</Button><button className="text-button" onClick={() => go("G-01")}>Edit session details</button></div></div>;
}
