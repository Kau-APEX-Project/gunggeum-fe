import "@/styles/connect.css";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { QrImage } from "@/components/ui/QrImage";
import { useApp } from "@/context/AppContext";
import { useGuideSession } from "@/lib/sessionStore";
import { GuideBrand } from "@/screens/guide/GuideBrand";

// G-02 QR 공유. 세션을 만들면 서버가 준 코드(GB-1042 형식)와 참가 링크로 진짜 QR 을 만든다
export function GuideShare() {
  const { go, startSession, notify } = useApp();
  const real = useGuideSession();
  // 세션 없이 시안 목록에서 바로 열었을 때는 예시 값을 보여줌
  const session = real ?? { code: "GB-1042", joinUrl: `${window.location.origin}/live/GB-1042`, title: "Afternoon Palace Tour" };
  const copy = (text: string, msg: string) => { navigator.clipboard?.writeText(text).catch(() => {}); notify(msg); };
  return <div className="guide-screen share compact screen-pad"><GuideBrand />
    <div className="share-step"><span>STEP 2 / 3</span><div className="steps"><i className="done" /><i className="on" /><i /></div></div>
    <h1>Share session</h1><p>Tourists scan to join with live subtitles.</p>
    <div className="share-card">
      <div className="share-title"><strong>{session.title}</strong><span className="status-chip">READY</span></div>
      <div className="share-qr"><QrImage value={session.joinUrl} size={196} label="Session QR" /></div>
      <span className="share-label">SESSION CODE</span>
      <div className="session-code" aria-label={`Session code ${session.code.split("").join(" ")}`}>{session.code}</div>
      <div className="share-actions">
        <button onClick={() => copy(session.code, "Session code copied")}>Copy code</button>
        <button onClick={() => copy(session.joinUrl, "Join link copied")}>Copy link</button>
      </div>
    </div>
    <div className="join-status" role="status"><span><i /> Waiting for tourists</span></div>
    <div className="flow-buttons"><Button onClick={() => { startSession(); go("G-03"); }}><Icon name="mic" /> Start talking</Button><button className="text-button" onClick={() => go("G-01")}>Edit session details</button></div></div>;
}
