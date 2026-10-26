export const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const genSessionCode = () => Array.from(crypto.getRandomValues(new Uint32Array(6)), (n) => codeChars[n % codeChars.length]).join("");

export const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

export const won = (n: number) => `₩${n.toLocaleString("en-US")}`;

export const distLabel = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
