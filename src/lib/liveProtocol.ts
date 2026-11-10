import type { SessionSummary } from "@/lib/apiTypes";

// 실시간 자막(WebSocket) 메시지 형식을 한 곳에 모아 둔 곳

export type LiveLine = { seq: number; ts: number | null; textKo: string; text: string; lang: string; cardIds: string[] };

export type LiveEvent =
  | { kind: "line"; line: LiveLine }
  | { kind: "gap"; fromSeq: number; toSeq: number }   // 재연결 중 놓친 자막 구간
  | { kind: "mic"; on: boolean }                       // 해설사 마이크 켜짐/꺼짐
  | { kind: "ended" }                                  // 해설사가 세션 종료
  | { kind: "other"; type: string };

export type SessionInfo = { code: string; status: "waiting" | "live" | "ended"; title: string; guideName: string; startedAt: string | null; micOn: boolean };
export type TourRow = { time: string; status: "upcoming" | "live" | "ended"; sessionCode: string | null; title: string; guideName: string };
export type { SessionSummary };

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** 서버가 보낸 WebSocket 메시지 한 개를 앱이 다루는 이벤트로 바꿈. 무시할 메시지는 null */
export function parseServerMessage(data: unknown): LiveEvent | null {
  if (typeof data !== "string") return null; // 바이너리 등은 자막이 아님
  let parsed: unknown;
  try { parsed = JSON.parse(data); } catch { return null; }
  const o = obj(parsed);
  if (!o) return null;
  const type = String(o.type ?? o.event ?? "").toLowerCase();

  if (["ping", "pong", "ack", "hello", "ready", "presence", "transcript"].includes(type)) return null; // 관람객 화면에서 쓰지 않음
  if (["session_ended", "ended", "session_end", "end"].includes(type)) return { kind: "ended" };
  if (type === "mic") {
    const on = o.on ?? o.micOn ?? o.mic_on ?? o.enabled;
    return { kind: "mic", on: typeof on === "boolean" ? on : String(o.state ?? o.status ?? "").toLowerCase() === "on" };
  }
  if (type === "gap") {
    const from = num(o.fromSeq ?? o.from_seq ?? o.from), to = num(o.toSeq ?? o.to_seq ?? o.to);
    return from === null || to === null ? null : { kind: "gap", fromSeq: from, toSeq: to };
  }
  if (type === "" || ["subtitle", "line", "caption", "sub"].includes(type)) {
    const body = obj(o.line) ?? obj(o.data) ?? o;
    const seq = num(body.seq);
    const text = str(body.text), textKo = str(body.textKo ?? body.text_ko);
    if (seq === null || (!text && !textKo)) return null;
    let ts = num(body.timestamp ?? body.ts);
    if (ts === null && typeof body.timestamp === "string") { const d = Date.parse(body.timestamp); ts = Number.isNaN(d) ? null : d; }
    const cardIds = Array.isArray(body.cardIds ?? body.card_ids) ? ((body.cardIds ?? body.card_ids) as unknown[]).map(String) : [];
    return { kind: "line", line: { seq, ts, textKo, text: text || textKo, lang: str(body.lang), cardIds } };
  }
  return { kind: "other", type };
}

/** 재연결 직후 "여기까지 받았다"고 알리는 메시지 */
export const resumeMessage = (lastSeq: number) => JSON.stringify({ type: "resume", lastSeq });
/** 30초마다 보내는 연결 유지 메시지 */
export const pingMessage = () => JSON.stringify({ type: "ping" });

export function listenUrl(wsBase: string, code: string, lang: string) {
  return `${wsBase}/ws/sessions/${encodeURIComponent(code)}/listen?lang=${encodeURIComponent(lang)}`;
}

/** 주소가 /live/GB-1042 모양이면 세션 코드를 꺼냄 (QR 로 들어온 경우) */
export function parseLiveCode(pathname: string): string | null {
  const m = pathname.match(/^\/live\/([A-Za-z0-9-]{3,24})\/?$/);
  return m ? normalizeCode(m[1]) : null;
}

/** 사용자가 입력한 코드를 정리 (공백 제거, 대문자, gb1042 > GB-1042) */
export function normalizeCode(raw: string): string {
  const c = raw.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}\d{4}$/.test(c) ? `${c.slice(0, 2)}-${c.slice(2)}` : c;
}

export function normalizeSession(raw: unknown, code: string): SessionInfo {
  const o = obj(raw) ?? {};
  const s = String(o.status ?? "live").toLowerCase();
  return {
    code: str(o.code, code),
    status: s === "waiting" || s === "ended" ? s : "live",
    title: str(o.title) || "Live tour",
    guideName: str(o.guideName ?? o.guide_name),
    startedAt: str(o.startedAt ?? o.started_at) || null,
    micOn: (o.micOn ?? o.mic_on) === true,
  };
}

export function normalizeTours(raw: unknown): TourRow[] {
  const o = obj(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(o?.tours) ? o.tours : Array.isArray(o?.items) ? o.items : [];
  return (list as unknown[]).flatMap((item) => {
    const t = obj(item);
    if (!t) return [];
    const s = String(t.status ?? "upcoming").toLowerCase();
    return [{
      time: str(t.time ?? t.startTime ?? t.start_time).slice(0, 5),
      status: (s === "live" || s === "ended" ? s : "upcoming") as TourRow["status"],
      sessionCode: str(t.sessionCode ?? t.session_code) || null,
      title: str(t.title) || "Guided tour",
      guideName: str(t.guideName ?? t.guide_name),
    }];
  });
}
