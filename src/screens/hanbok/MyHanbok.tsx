import { type FormEvent } from "react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { QrCode } from "@/components/ui/QrCode";
import { won } from "@/lib/format";
import { useApp } from "@/context/AppContext";

export function MyHanbok() {
  const { duration, setQrCode, openBk, setOpenBk, cancelAsk, setCancelAsk, lookupMsg, setLookupMsg, bookings, setBookings, go } = useApp();
  function lookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") || "").trim().toUpperCase();
    const hit = bookings.find((b) => b.code === code);
    if (hit) { setOpenBk(hit.code); setLookupMsg(`Found booking ${hit.code}.`); } else setLookupMsg("No booking found for this code on this device. Check the code in your confirmation.");
  }
  return <div className="screen-pad hb"><ScreenHeader title="My Hanbok booking" /><p className="intro">Bookings on this device. No account needed.</p>
    {bookings.length === 0 && <div className="hb-empty">No bookings yet.<button className="text-button" onClick={() => go("T-60")}>Browse hanbok rentals</button></div>}
    {bookings.map((b) => { const open = openBk === b.code; const cancelled = b.status === "cancelled";
      return <div className={`bk-card ${cancelled ? "cancelled" : ""}`} key={b.code}>
        <div className="bk-top"><span className="tag">{cancelled ? "Cancelled" : "Upcoming booking"}</span><b>{b.code}</b></div>
        <strong className="bk-shop">{b.shop}</strong>
        {!cancelled && <div className="bk-qr"><QrCode seed={b.code} size={92} label="Hanbok Rental QR" /><div><b>Hanbok Rental QR</b><span className="hb-code">{b.code}</span><Button secondary onClick={() => { setQrCode(b.code); go("T-65A"); }}>Show QR</Button></div></div>}
        <div className="bk-rows"><div><span>Pickup time</span><b>{b.pickup}</b></div><div><span>Rental duration</span><b>{b.duration}</b></div><div><span>Number of people</span><b>{b.people}</b></div><div><span>Payment status</span><b className={cancelled ? "" : "paid"}>{cancelled ? "Refund pending" : "Paid"}</b></div></div>
        {open && <div className="bk-open"><p>Pickup: {b.pickupPlace}</p><p>Total paid: {won(b.total)}</p>{!cancelled && <p>Show this QR code at the rental shop when you arrive.</p>}</div>}
        {cancelAsk === b.code && <div className="bk-confirm"><p>Cancel this booking? Free cancellation up to 24 hours before pickup. Refund takes 3–5 business days.</p><div><Button secondary onClick={() => setCancelAsk(null)}>Keep booking</Button><Button onClick={() => { setBookings(bookings.map((x) => x.code === b.code ? { ...x, status: "cancelled" } : x)); setCancelAsk(null); }}>Yes, cancel</Button></div></div>}
        {cancelAsk !== b.code && <div className="bk-actions"><Button secondary onClick={() => setOpenBk(open ? null : b.code)}>{open ? "Hide booking" : "View booking"}</Button>{!cancelled && <button className="bk-cancel" onClick={() => setCancelAsk(b.code)}>Cancel booking</button>}</div>}
      </div>; })}
    <form className="hb-lookup" onSubmit={lookup}><label className="field-label">Find a booking by reservation code<input name="code" placeholder="e.g. HB-4821" autoComplete="off" className="code-input" /></label><Button secondary>Find booking</Button>{lookupMsg && <p className="hb-lookup-msg">{lookupMsg}</p>}</form>
    <div className="flow-buttons"><button className="text-button" onClick={() => go("T-60")}>Book another hanbok</button></div></div>;
}
