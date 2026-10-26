import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { hanbokShops } from "@/data/hanbok";
import { distLabel, won } from "@/lib/format";
import { useApp } from "@/context/AppContext";

export function HanbokHome() {
  const { hanbokFilters, setHF, go, openShop } = useApp();
  const toggle = (f: string) => setHF(hanbokFilters.includes(f) ? hanbokFilters.filter((x) => x !== f) : [...hanbokFilters, f]);
  const durFilters = hanbokFilters.filter((f) => f !== "Near palace");
  const list = hanbokShops.map((s, i) => ({ s, i })).filter(({ s }) => (!hanbokFilters.includes("Near palace") || s.dist <= 300) && (!durFilters.length || durFilters.some((d) => d in s.prices)));
  return <div className="screen-pad hb"><ScreenHeader title="" action={<button className="pill-link" onClick={() => go("T-65")}>My booking</button>} />
    <Photo label="Hanbok rental" className="hb-hero" />
    <h1 className="hb-title">Hanbok rental</h1><p className="hb-sub">Rent a traditional Korean outfit and explore Gyeongbokgung.</p>
    <div className="no-signup hb-nosignup"><Icon name="check" size={15} /> No account needed to book or pay</div>
    <div className="chips wrap hb-filters">{["Near palace", "2 hours", "4 hours", "Full day"].map((f) => <button key={f} className={hanbokFilters.includes(f) ? "selected" : ""} onClick={() => toggle(f)}>{f}</button>)}</div>
    <p className="count-label">{list.length} rental shop{list.length === 1 ? "" : "s"}</p>
    {list.length === 0 && <div className="hb-empty">No shops match these filters. Try removing one.</div>}
    {list.map(({ s, i }) => { const offered = Object.keys(s.prices); const pool = durFilters.filter((d) => d in s.prices); const from = Math.min(...(pool.length ? pool : offered).map((d) => s.prices[d]));
      return <button key={s.name} className="hb-card" onClick={() => openShop(i)}><Photo label={s.name} className="hb-thumb" />
        <span className="hb-card-copy"><strong>{s.name}</strong><small>{distLabel(s.dist)} from palace · ★ {s.rating} ({s.reviews})</small><small>{offered.join(" · ")}</small><b>From {won(from)}</b><em>View details <Icon name="chevron" size={13} /></em></span></button>; })}
  </div>;
}
