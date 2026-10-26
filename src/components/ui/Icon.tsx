import { type ReactNode } from "react";
import type { IconName } from "@/types";

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m5 12 6-6m-6 6 6 6M5 12h14" />,
    ask: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.4 2.4 0 0 1 4.6 1c0 2-2.4 2.1-2.4 4M12 18h.01" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M10 20h4" /></>,
    camera: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="m8 6 1.5-2h5L16 6" /><circle cx="12" cy="13" r="4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <path d="M5 5l14 14M19 5 5 19" />,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15 9-2 4-4 2 2-4 4-2Z" /></>,
    headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M3 6h1M3 12h1M3 18h1" /></>,
    location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
    pause: <><path d="M9 7v10M15 7v10" /></>,
    play: <path d="m9 6 9 6-9 6V6Z" />,
    route: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h4a3 3 0 0 1 0 6h-1a3 3 0 0 0 0 6h5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    send: <path d="m3 11 18-8-8 18-2-8-8-2Zm8 2 5-5" />,
    stamp: <><path d="M8 13c1-2 1-3 1-5a3 3 0 0 1 6 0c0 2 0 3 1 5l2 2H6l2-2Z" /><path d="M5 18h14v3H5z" /></>,
    tour: <><path d="M7 20v-8M17 20v-8M4 20h16" /><path d="M6 10h12l-1-7H7l-1 7ZM9 6h6" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
