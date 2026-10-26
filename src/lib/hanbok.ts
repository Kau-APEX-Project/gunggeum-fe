import { hanbokShops, hbAcc, hbOptions } from "@/data/hanbok";
import type { HbBooking } from "@/types";

export function quote(shop: (typeof hanbokShops)[number], b: HbBooking) {
  const adult = shop.prices[b.duration] ?? Object.values(shop.prices)[0];
  const child = Math.round((adult * 0.7) / 1000) * 1000;
  const people = b.adults + b.children;
  const lines: [string, number][] = [[`Adult × ${b.adults}`, adult * b.adults]];
  if (b.children) lines.push([`Child × ${b.children}`, child * b.children]);
  if (hbOptions[b.option]) lines.push([`${b.option} × ${people}`, hbOptions[b.option] * people]);
  b.acc.forEach((a) => lines.push([a, hbAcc[a]]));
  const sub = lines.reduce((n, l) => n + l[1], 0);
  const fee = 1000;
  return { adult, child, lines, sub, fee, total: sub + fee };
}
