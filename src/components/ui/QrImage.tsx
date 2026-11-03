import { useEffect, useState } from "react";
import QRCode from "qrcode";

// 진짜 QR 코드(value를 담음). 카메라로 찍으면 value 주소가 열린다
// 테스트 시 사용 전 최초 1회 pnpm add qrcode  후  pnpm add -D @types/qrcode
export function QrImage({ value, size = 196, label = "QR code" }: { value: string; size?: number; label?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let off = false;
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => { if (!off) setSrc(url); })
      .catch(() => { if (!off) setSrc(""); });
    return () => { off = true; };
  }, [value, size]);
  return src
    ? <img src={src} width={size} height={size} alt={label} style={{ display: "block" }} />
    : <div style={{ width: size, height: size }} aria-busy="true" />;
}
