import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { hanbokShops, hbDates } from "@/data/hanbok";
import { distLabel, won } from "@/lib/format";
import { useApp } from "@/context/AppContext";

export function HanbokDetail() {
  const { shopIdx, go } = useApp();
  const s = hanbokShops[shopIdx];
  return <div className="detail-screen hb"><ScreenHeader title="Hanbok shop" /><Photo label={s.name} className="hero-photo" />
    <div className="detail-body hb-body"><span className="tag">HANBOK RENTAL</span><h1>{s.name}</h1>
    <div className="hb-meta"><span><Icon name="location" size={14} /> {distLabel(s.dist)} from Gyeongbokgung</span><span>★ {s.rating} ({s.reviews} reviews)</span></div>
    <p className="body-copy">{s.desc}</p>
    <h3>Rental durations &amp; price</h3><div className="hb-price-list">{Object.entries(s.prices).map(([d, p]) => <div key={d}><span>{d}</span><strong>{won(p)}</strong><small>per adult</small></div>)}</div>
    <h3>Included</h3><ul className="hb-list">{s.included.map((x) => <li key={x}><Icon name="check" size={13} />{x}</li>)}</ul>
    <h3>Pickup / return</h3><p className="body-copy">{s.pickup}</p>
    <h3>Available times</h3><div className="hb-slots">{hbDates.slice(0, 2).map((d, di) => <div key={d[0]}><b>{d[0]}</b><div className="chips wrap">{["10:00", "11:00", "13:00", "14:00"].slice(di === 0 ? 1 : 0).map((t) => <span className="lang-chip" key={t}>{t}</span>)}</div></div>)}</div>
    <p className="hb-secure"><Icon name="check" size={13} /> Payment is completed securely before pickup.</p></div>
    <div className="hb-bar solo"><Button onClick={() => go("T-62")}>Book now</Button></div></div>;
}
