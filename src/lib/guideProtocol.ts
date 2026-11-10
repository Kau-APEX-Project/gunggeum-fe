// 해설사 콘솔(G-03)의 WebSocket 메시지 형식을 한 곳에 모아 둔 곳
// BE에서 필요한 것: 주소(/ws/sessions/{code}/guide?token=), 음성 = PCM 16kHz mono 16bit 조각, location = {"type":"location","poiId":"place:…"},
// mic 메시지(마이크 켜짐/꺼짐), 서버가 보내는 presence(참여자 수·언어 분포)·transcript(인식 문장).
// BE 문서에 없어서 임시로 우선 넣음:
//   - 조각 크기: 100ms (1600샘플, 3200바이트) > FRAME_MS
//   - mic 메시지 모양: {"type":"mic","on":true|false}
//   - presence/transcript/오류 메시지의 필드 이름 (여러 이름을 너그럽게 받아들임)
//   - 해설사 쪽에도 30초마다 ping 을 보냄

export const SAMPLE_RATE = 16000;
export const FRAME_MS = 100;
export const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000; // 1600

export const guideUrl = (wsBase: string, code: string, token: string) =>
  `${wsBase}/ws/sessions/${encodeURIComponent(code)}/guide?token=${encodeURIComponent(token)}`;
export const micMessage = (on: boolean) => JSON.stringify({ type: "mic", on });
export const locationMessage = (poiId: string) => JSON.stringify({ type: "location", poiId });

export type GuideEvent =
  | { kind: "presence"; participants: number; languages: Record<string, number> }
  | { kind: "transcript"; text: string }
  | { kind: "error"; message: string }
  | { kind: "other"; type: string };

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** 서버가 해설사에게 보낸 메시지 한 개를 이벤트로 바꾼다. 무시할 메시지는 null */
export function parseGuideMessage(data: unknown): GuideEvent | null {
  if (typeof data !== "string") return null;
  let parsed: unknown;
  try { parsed = JSON.parse(data); } catch { return null; }
  const o = obj(parsed);
  if (!o) return null;
  const type = String(o.type ?? o.event ?? "").toLowerCase();
  if (["ping", "pong", "ack", "hello", "ready", "mic", "session_ended", "ended"].includes(type)) return null;

  if (type === "presence") {
    const langsRaw = obj(o.languages ?? o.langs ?? o.byLang ?? o.by_lang) ?? {};
    const languages: Record<string, number> = {};
    for (const [k, v] of Object.entries(langsRaw)) { const n = num(v); if (n !== null) languages[k] = n; }
    const total = num(o.participants ?? o.count ?? o.total ?? o.listeners) ?? Object.values(languages).reduce((a, b) => a + b, 0);
    return { kind: "presence", participants: total, languages };
  }
  if (type === "transcript") {
    const text = str(o.text ?? o.textKo ?? o.text_ko ?? o.sentence ?? o.transcript);
    return text ? { kind: "transcript", text } : null;
  }
  if (type.includes("error") || type === "stt_failed") {
    return { kind: "error", message: str(o.message ?? o.error) || "Speech recognition connection failed." };
  }
  return { kind: "other", type };
}
