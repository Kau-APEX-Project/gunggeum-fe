import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fmt } from "@/lib/format";
import { clearSession, useGuideSession, useGuideSummary } from "@/lib/sessionStore";
import { GuideBrand } from "@/screens/guide/GuideBrand";
import { useApp } from "@/context/AppContext";

const LANG_NAMES: Record<string, string> = { en: "EN", th: "TH", ko: "KO" };

// G-04 종료 요약. 서버가 준 값(진행 시간, 최대 참여자, 언어별 인원)만 보여 줍니다.
// (자막 원문은 서버에 저장하지 않으므로 "자막 줄 수"는 없습니다)
export function GuideSummary() {
  const { guideSec, go } = useApp();
  const session = useGuideSession();
  const summary = useGuideSummary();
  const entries = summary ? Object.entries(summary.languages) : [["en", 15], ["th", 8]] as [string, number][];
  const languages = entries.length > 0 ? entries.map(([l, n]) => `${LANG_NAMES[l] ?? l.toUpperCase()} ${n}`).join(" · ") : "—";
  return <div className="guide-screen compact screen-pad ended"><GuideBrand /><div className="line-illustration small"><Icon name="check" size={38} /></div><h1>Session ended</h1><p>{session?.title ?? "Afternoon Palace Tour"}</p>
    <div className="guide-stats"><div><span>Duration</span><strong>{fmt(summary ? summary.durationSec : guideSec)}</strong></div><div><span>Peak participants</span><strong>{summary ? summary.peakParticipants : 23}</strong></div><div><span>Language distribution</span><strong>{languages}</strong></div></div>
    <div className="flow-buttons"><Button onClick={() => { clearSession(); go("T-00"); }}>Done</Button></div></div>;
}
