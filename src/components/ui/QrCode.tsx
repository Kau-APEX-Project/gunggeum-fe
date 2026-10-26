import { type ReactNode } from "react";

export function QrCode({ seed, size = 180, label = "QR code" }: { seed: string; size?: number; label?: string }) {
  const n = 25;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const cells: ReactNode[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd() > 0.52) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  const finder = (ox: number, oy: number) => <g key={`${ox}-${oy}`}><rect x={ox} y={oy} width="7" height="7" /><rect x={ox + 1} y={oy + 1} width="5" height="5" fill="#fff" /><rect x={ox + 2} y={oy + 2} width="3" height="3" /></g>;
  return <svg role="img" aria-label={`${label} ${seed} (placeholder)`} width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} fill="#333" shapeRendering="crispEdges"><rect x="-1" y="-1" width={n + 2} height={n + 2} fill="#fff" />{cells}{finder(0, 0)}{finder(n - 7, 0)}{finder(0, n - 7)}</svg>;
}
