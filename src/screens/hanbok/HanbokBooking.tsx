import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { hanbokShops, hbAcc, hbDates, hbOptions } from "@/data/hanbok";
import { won } from "@/lib/format";
import { quote } from "@/lib/hanbok";
import { Stepper } from "@/screens/hanbok/Stepper";
import { useApp } from "@/context/AppContext";

export function HanbokBooking() {
  const { duration, shopIdx, bk, setBk, go } = useApp();
  const s = hanbokShops[shopIdx]; const q = quote(s, bk);
  return <div className="screen-pad hb"><ScreenHeader title="Book hanbok" /><p className="intro">{s.name}</p>
    <div className="field-label">Date<div className="chips wrap">{hbDates.map((d, i) => <button key={d[0]} className={bk.date === i ? "selected" : ""} onClick={() => setBk({ ...bk, date: i })}>{d[1]}</button>)}</div></div>
    <div className="field-label">Pickup time<div className="chips wrap">{["10:00", "11:00", "13:00", "14:00"].map((t) => <button key={t} className={bk.time === t ? "selected" : ""} onClick={() => setBk({ ...bk, time: t })}>{t}</button>)}</div></div>
    <div className="field-label">Rental duration<div className="chips wrap">{Object.keys(s.prices).map((d) => <button key={d} className={bk.duration === d ? "selected" : ""} onClick={() => setBk({ ...bk, duration: d })}>{d}</button>)}</div></div>
    <div className="field-label">Number of people · {bk.adults + bk.children}<Stepper label="Adult" sub={`${won(q.adult)} each`} value={bk.adults} min={1} onChange={(n) => setBk({ ...bk, adults: n })} /><Stepper label="Child" sub={`Under 12 · ${won(q.child)} each`} value={bk.children} min={0} onChange={(n) => setBk({ ...bk, children: n })} /></div>
    <div className="field-label">Hanbok option<div className="chips wrap">{Object.entries(hbOptions).map(([o, p]) => <button key={o} className={bk.option === o ? "selected" : ""} onClick={() => setBk({ ...bk, option: o })}>{o}{p ? ` +${won(p)}` : ""}</button>)}</div></div>
    <div className="field-label">Optional accessories{Object.entries(hbAcc).map(([a, p]) => <label className="hb-check" key={a}><input type="checkbox" checked={bk.acc.includes(a)} onChange={() => setBk({ ...bk, acc: bk.acc.includes(a) ? bk.acc.filter((x) => x !== a) : [...bk.acc, a] })} />{a}<span>+{won(p)}</span></label>)}</div>
    <div className="hb-breakdown"><h3>Price breakdown</h3>{q.lines.map(([l, v]) => <div key={l}><span>{l}</span><b>{won(v)}</b></div>)}<div><span>Service fee</span><b>{won(q.fee)}</b></div><div className="total"><span>Total</span><strong>{won(q.total)}</strong></div></div>
    <div className="hb-bar"><div><small>Total</small><strong>{won(q.total)}</strong></div><Button onClick={() => go("T-63")}>Continue to payment</Button></div></div>;
}
