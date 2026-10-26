import { Button } from "@/components/ui/Button";
import { QrCode } from "@/components/ui/QrCode";
import { useApp } from "@/context/AppContext";

export function HanbokQrFull() {
  const { qrCode, bookings, go } = useApp();
  const b = bookings.find((x) => x.code === qrCode) || bookings[0];
  return <div className="qr-full hb-qr-full screen-pad"><div className="guide-brand">GungGeum</div>
    <strong className="qr-full-title">Hanbok Rental QR</strong>
    <div className="qr-full-box"><QrCode seed={b.code} size={290} label="Hanbok Rental QR" /></div>
    <span className="hb-code big">{b.code}</span><p className="qr-help">Show this QR code at the rental shop.</p>
    <div className="flow-buttons"><Button secondary onClick={() => go("T-65")}>Back</Button></div></div>;
}
