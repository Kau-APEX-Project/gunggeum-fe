import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { QrCode } from "@/components/ui/QrCode";
import { useApp } from "@/context/AppContext";

export function HanbokConfirmed() {
  const { newCode, hbSave, setHbSave, setOpenBk, bookings, go } = useApp();
  const b = bookings.find((x) => x.code === newCode) || bookings[0];
  function save() {
    if (hbSave !== "idle") return;
    setHbSave("saving");
    window.setTimeout(() => setHbSave("saved"), 900);
  }
  return <div className="screen-pad hb ended"><div className="line-illustration small"><Icon name="check" size={38} /></div><h1>Booking confirmed</h1>
    <div className="hb-qr-card"><strong>Hanbok Rental QR</strong><QrCode seed={b.code} size={200} label="Hanbok Rental QR" /><span className="hb-code">{b.code}</span></div>
    <div className="hb-keep-notice" role="note"><Icon name="info" size={18} /><p><strong>Please save this QR code and do not lose it.</strong><br />You will need to show it at the rental shop.</p></div>
    <Button disabled={hbSave === "saving"} onClick={save}>{hbSave === "saving" ? "Saving…" : "Save QR image"}</Button>
    {hbSave === "saved" && <div className="hb-saved" role="status"><Icon name="check" size={14} /> QR image saved.</div>}
    <div className="guide-stats hb-facts"><div><span>Shop</span><strong>{b.shop}</strong></div><div><span>Rental date</span><strong>{b.date}</strong></div><div><span>Pickup time</span><strong>{b.time}</strong></div><div><span>Number of people</span><strong>{b.people}</strong></div><div><span>Reservation status</span><strong>Confirmed</strong></div><div><span>Reservation code</span><strong>{b.code}</strong></div><div><span>Pickup location</span><strong className="wrapv">{b.pickupPlace}</strong></div></div>
    <div className="flow-buttons"><Button secondary onClick={() => { setOpenBk(b.code); go("T-65"); }}>View booking</Button><button className="text-button" onClick={() => go("T-10")}>Back to Map</button></div></div>;
}
