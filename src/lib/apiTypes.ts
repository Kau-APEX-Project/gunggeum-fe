// 서버(API)와 주고받는 값의 모양, 오류 종류, 오류 문구를 모아두는 곳
// 모양은 API 명세서 v0.2 · 기능명세서 v0.3 기준이며 실제 서버(openapi.json)와 대조해서 확정해야 함

export type ApiErrorKind =
  | "bad_request"   // 400: 입력 확인 (빈 질문, 300자 초과, 동의 없음)
  | "unauthorized"  // 401: 가이드 토큰 필요
  | "forbidden"     // 403: 가이드 접근 코드가 틀림
  | "not_found"     // 404
  | "rate_limit"    // 429: 요청이 너무 많음 > S-06
  | "server"        // 500, 503
  | "timeout"       // 504 또는 시간 초과
  | "network";      // 서버에 닿지 못함

export class ApiError extends Error {
  kind: ApiErrorKind;
  status: number;
  constructor(kind: ApiErrorKind, status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

export type AskAction =
  | { type: "route"; to: string }   // to = pois.json 의 id
  | { type: "amenity"; category: "restroom" | "bench" | "water" };

export type AskResponse = { answer: string; language: "ko" | "en" | "th"; action: AskAction | null };

export type CardResponse = {
  id: string;                       // "b-160" 또는 "t-24"
  type: "building" | "term";
  name: string;                     // 한글 이름
  name_en: string | null;
  name_th: string | null;
  text: string;
  text_en: string | null;
  text_th: string | null;
  category: string | null;
  photo: string | null;             // "/photos/160.jpg"
  photo_license: string | null;
  photo_source: string | null;
};

export type SessionCreateBody = { consent: boolean; accessCode?: string; title?: string; guideName?: string; tourTime?: string };
export type SessionCreated = { code: string; joinUrl: string; guideToken: string; sourceLang: string; startedAt: string };
export type SessionSummary = { code: string; durationSec: number; peakParticipants: number; languages: Record<string, number>; mentionedCards: string[] };

// ---------- 화면에 보여 줄 오류 문구 (영어 UI) ----------
export function askErrorText(kind?: ApiErrorKind): string {
  switch (kind) {
    case "rate_limit": return "Too many questions right now. Please try again in a moment.";
    case "bad_request": return "Please check your question (1 to 300 characters).";
    case "timeout": return "This is taking longer than expected. Please try again.";
    default: return "We couldn't prepare an answer. Please try again.";
  }
}

export function sessionErrorText(kind?: ApiErrorKind): string {
  switch (kind) {
    case "forbidden": return "The guide access code is incorrect.";
    case "rate_limit": return "Too many requests right now. Please try again in a moment.";
    case "bad_request": return "Please agree to the voice policy and check the form.";
    case "unauthorized": return "This session can no longer be controlled from this device.";
    default: return "We couldn't reach the server. Check your connection and try again.";
  }
}
