import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { hanbokShops, hbDates } from "@/data/hanbok";
import { won } from "@/lib/format";
import { quote } from "@/lib/hanbok";
import { useApp } from "@/context/AppContext";

export function HanbokPayment() {
  const { shopIdx, bk, payMethod, setPayMethod, paying, setPaying, setNewCode, setHbSave, bookings, setBookings, go } = useApp();
  const s = hanbokShops[shopIdx]; const q = quote(s, bk);
  const methods: [string, string, string][] = [["card", "Credit / debit card", "Visa, Mastercard, UnionPay"], ["mobile", "Mobile payment", "Apple Pay, Google Pay, Samsung Pay"], ["other", "Other payment method", "Alipay, WeChat Pay, KakaoPay"]];
  function pay() {
    setPaying(true);
    window.setTimeout(() => {
      const code = `HB-${2841 + (bookings.length - 1) * 17}`;
      setBookings((b) => [{ code, shop: s.name, date: hbDates[bk.date][1], time: bk.time, people: bk.adults + bk.children, pickup: `${hbDates[bk.date][1]} · ${bk.time}`, duration: bk.duration, pickupPlace: s.pickup, total: q.total, status: "upcoming" }, ...b]);
      setPaying(false); setHbSave("idle"); setNewCode(code); go("T-64");
    }, 1200);
  }
  return <div className="screen-pad hb"><ScreenHeader title="Payment" />
    <div className="hb-breakdown summary"><h3>Order summary</h3>
      <div><span>Rental shop</span><b>{s.name}</b></div><div><span>Date / time</span><b>{hbDates[bk.date][1]} · {bk.time}</b></div><div><span>Duration</span><b>{bk.duration}</b></div>
      <div><span>Items</span><b>{bk.adults} adult{bk.children ? `, ${bk.children} child` : ""} · {bk.option}{bk.acc.length ? ` + ${bk.acc.length} acc.` : ""}</b></div>
      <div><span>Subtotal</span><b>{won(q.sub)}</b></div><div><span>Service fee</span><b>{won(q.fee)}</b></div><div className="total"><span>Total</span><strong>{won(q.total)}</strong></div></div>
    <h3 className="section-title">Payment method</h3>
    {methods.map(([id, t, d]) => <button key={id} className={`pay-method ${payMethod === id ? "selected" : ""}`} onClick={() => setPayMethod(id)}><span className="radio-dot" /><span><strong>{t}</strong><small>{d}</small></span></button>)}
    <p className="hb-secure"><Icon name="check" size={13} /> Your payment information is processed securely by the payment provider.</p>
    <div className="hb-bar solo"><Button disabled={paying} onClick={pay}>{paying ? "Processing payment…" : `Pay and confirm booking · ${won(q.total)}`}</Button></div></div>;
}
