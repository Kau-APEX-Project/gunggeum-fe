import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import type { SessionSummary } from "@/lib/apiTypes";
import { fetchSessionSummary } from "@/lib/api";
import { useCard } from "@/lib/cards";
import { useLanguage } from "@/lib/language";
import { leaveLive, useLive } from "@/lib/liveStore";

function CardChip({ id }: { id: string }) {
  const { setNoun } = useApp();
  const lang = useLanguage();
  const { card } = useCard(id);
  const name = card ? (lang === "th" ? card.name_th ?? card.name_en : card.name_en) ?? card.name : id;
  return <button onClick={() => setNoun(`card:${id}`)}>{name}</button>;
}

export function SessionEnded() {
  const { setNoun, go } = useApp();
  const live = useLive();
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  useEffect(() => {
    if (live.mode !== "real" || !live.code) return;
    let off = false;
    fetchSessionSummary(live.code).then((s) => { if (!off) setSummary(s); }).catch(() => { /* 요약을 못 받아도 종료 화면은 보여 줌 */ });
    return () => { off = true; };
  }, [live.mode, live.code]);

  const real = live.mode === "real";
  const minutes = summary ? Math.max(1, Math.round(summary.durationSec / 60)) : null;
  const cards = summary?.mentionedCards ?? [];
  const exit = (to: "T-30" | "T-10") => { leaveLive(); go(to); };
  return <div className="screen-pad ended"><div className="line-illustration"><Icon name="check" size={46} /></div><h1>The tour has ended</h1><p>This live interpretation session has ended.</p>
    {real
      ? <>{summary && <div className="session-stat"><span>Duration<strong>{minutes} min</strong></span><span>Buildings<strong>{cards.length}</strong></span></div>}
        {cards.length > 0 && <><h3>Buildings mentioned</h3><div className="chips wrap">{cards.map((id) => <CardChip key={id} id={id} />)}</div></>}</>
      : <><div className="session-stat"><span>Duration<strong>42 min</strong></span><span>Buildings<strong>4</strong></span></div><h3>Buildings mentioned</h3><div className="chips wrap">{["Geunjeongjeon", "Sajeongjeon", "Gyeonghoeru", "Gangnyeongjeon"].map((x) => <button key={x} onClick={() => setNoun(x)}>{x}</button>)}</div></>}
    <div className="bottom-buttons"><Button onClick={() => exit("T-30")}>Back to Live Tour</Button><Button secondary onClick={() => exit("T-10")}>Back to Map</Button></div></div>;
}
