export type ScreenId =
  | "T-00" | "T-01" | "T-02"
  | "T-10" | "T-11" | "T-12" | "T-13" | "T-14" | "T-15" | "T-16"
  | "T-20" | "T-21" | "T-22"
  | "T-30" | "T-31" | "T-32"
  | "T-40" | "T-41" | "T-42"
  | "T-60" | "T-61" | "T-62" | "T-63" | "T-64" | "T-65" | "T-65A"
  | "T-50" | "T-51"
  | "G-00" | "G-01" | "G-02" | "G-03" | "G-04" | "G-05"
  | "S-01" | "S-02" | "S-03" | "S-04" | "S-05";

export type IconName =
  | "arrow" | "ask" | "bell" | "camera" | "check" | "chevron" | "close"
  | "compass" | "headphones" | "info" | "list" | "location" | "map" | "mic"
  | "pause" | "play" | "route" | "search" | "send" | "stamp" | "tour";

export type HbBooking = { date: number; time: string; duration: string; adults: number; children: number; option: string; acc: string[] };

export type HbRecord = { code: string; shop: string; date: string; time: string; people: number; pickup: string; duration: string; pickupPlace: string; total: number; status: string };
