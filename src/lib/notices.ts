import { useEffect, useSyncExternalStore } from "react";
import { USE_MOCK, request } from "@/lib/api";
import { useLanguage, type Lang } from "@/lib/language";

// 공지를 서버(GET /api/notices?lang=)에서 받아 두고 T-10 배너와 T-50 목록이 함께 쓰는 저장소
// 서버가 연결되지 않은(가짜 서버) 상태에서는 시안용 예시 공지를 보여줌
// 번역이 없는 공지는 서버가 한국어 원문(lang: "ko")으로 보내며 그대로 표시함

export type Notice = { id: string; type: string; title: string; body: string; publishedAt: number | null; lang: string };

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// 응답 모양이 배열이든 { notices: [] } 든 받아들이고 필드 이름도 여러 가지를 허용함
export function normalizeNotices(raw: unknown): Notice[] {
  const wrap = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const list = Array.isArray(raw) ? raw : Array.isArray(wrap?.notices) ? wrap.notices : Array.isArray(wrap?.items) ? wrap.items : [];
  const out: Notice[] = [];
  for (const item of list as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = str(o.title);
    const body = str(o.body);
    if (!title && !body) continue;
    const at = o.publishedAt ?? o.published_at;
    const ms = typeof at === "number" ? (at < 1e12 ? at * 1000 : at) : typeof at === "string" ? Date.parse(at) : NaN;
    out.push({ id: str(o.id) || `n-${out.length}`, type: str(o.type), title: title || body, body: title ? body : "", publishedAt: Number.isNaN(ms) ? null : ms, lang: str(o.lang) });
  }
  return out;
}

const TYPE_LABELS: Record<string, string> = { tour_cancelled: "Tour cancelled", weather: "Weather", event_change: "Event change" };
export const typeLabel = (type: string) => TYPE_LABELS[type] ?? (type ? type.replace(/_/g, " ") : "Notice");

const pad = (n: number) => String(n).padStart(2, "0");
/** 오늘이면 "14:05", 다른 날이면 "11/09 14:05" 로 표시함 */
export function formatWhen(ms: number | null, now: number = Date.now()): string {
  if (ms === null) return "";
  const d = new Date(ms);
  const n = new Date(now);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay = d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  return sameDay ? time : `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${time}`;
}

// 시안용 예시 공지 (서버 미연결 상태에서만 사용)
const sample = (): Notice[] => {
  const now = Date.now();
  return [
    { id: "n-sample-1", type: "tour_cancelled", title: "Today 14:00 English tour cancelled due to rain.", body: "", publishedAt: now - 12 * 60000, lang: "en" },
    { id: "n-sample-2", type: "weather", title: "Rain is expected after 13:00. Stone paths may be slippery.", body: "", publishedAt: now - 60 * 60000, lang: "en" },
    { id: "n-sample-3", type: "event_change", title: "The Changing of the Guard ceremony will move to Heungnyemun.", body: "", publishedAt: now - 24 * 3600000, lang: "en" },
  ];
};

type State = { status: "idle" | "loading" | "ready" | "error"; notices: Notice[]; lang: Lang | null; at: number };
let state: State = { status: "idle", notices: [], lang: null, at: 0 };
let seq = 0; // 새 요청이 생기면 이전 요청의 늦은 응답을 버리기 위한 번호
const STALE_MS = 60000; // 이 시간 안에는 같은 언어 공지를 다시 받지 않음
const listeners = new Set<() => void>();
function set(patch: Partial<State>) { state = { ...state, ...patch }; listeners.forEach((l) => l()); }
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const getNotices = () => state;

/** 공지를 받아 옴. force 가 아니면 같은 언어로 최근에 받은 것을 그대로 씀 */
export async function loadNotices(lang: Lang, force = false): Promise<void> {
  const fresh = state.lang === lang && state.status === "ready" && Date.now() - state.at < STALE_MS;
  if (!force && fresh) return;
  if (!force && state.lang === lang && state.status === "loading") return;
  const id = ++seq;
  const keep = state.lang === lang ? state.notices : []; // 같은 언어면 기존 목록을 유지해서 깜빡임을 줄임
  set({ status: "loading", lang, notices: keep });
  if (USE_MOCK) { set({ status: "ready", notices: sample(), at: Date.now() }); return; }
  try {
    const notices = normalizeNotices(await request<unknown>("GET", `/api/notices?lang=${encodeURIComponent(lang)}`, { timeoutMs: 15000 }));
    if (id === seq) set({ status: "ready", notices, at: Date.now() });
  } catch {
    if (id === seq) set({ status: "error" });
  }
}

export function useNotices() {
  const lang = useLanguage();
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => { void loadNotices(lang); }, [lang]);
  return { ...s, reload: () => loadNotices(lang, true) };
}
