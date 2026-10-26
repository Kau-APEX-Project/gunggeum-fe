import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fmt } from "@/lib/format";
import { GuideBrand } from "@/screens/guide/GuideBrand";
import { useApp } from "@/context/AppContext";

export function GuideSummary() {
  const { guideSec, go } = useApp();
  return <div className="guide-screen compact screen-pad ended"><GuideBrand /><div className="line-illustration small"><Icon name="check" size={38} /></div><h1>Session ended</h1><p>Afternoon Palace Tour</p>
    <div className="guide-stats"><div><span>Duration</span><strong>{fmt(guideSec)}</strong></div><div><span>Peak participants</span><strong>27</strong></div><div><span>Language distribution</span><strong>EN 15 · VI 5 · TH 3</strong></div><div><span>Translated subtitle lines</span><strong>418</strong></div></div>
    <div className="flow-buttons"><Button onClick={() => go("G-05")}>Done</Button></div></div>;
}
