import { ApiError, type ApiErrorKind, type AskResponse, type CardResponse, type SessionCreateBody, type SessionCreated, type SessionSummary } from "@/lib/apiTypes";
import type { Lang } from "@/lib/language";
import { normalizeSession, normalizeTours, type SessionInfo, type TourRow } from "@/lib/liveProtocol";
import * as mock from "@/lib/mockApi";

// 백엔드 서버 연결 모듈
const raw = String(import.meta.env.VITE_API_BASE ?? "").trim();
const sameOrigin = raw.toLowerCase() === "same-origin";
const base = sameOrigin ? "" : raw.replace(/\/+$/, "");
export const USE_MOCK = !sameOrigin && base === "";

export const wsBase: string = sameOrigin
  ? (typeof window === "undefined" ? "" : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`)
  : base.replace(/^http/i, "ws");
if (USE_MOCK && import.meta.env.DEV) {
  console.info("[api] VITE_API_BASE 가 비어 있어 가짜 서버(mock)로 동작합니다.");
}

// 서버 요청이 실패하면 개발 중에 콘솔에 남김
function fail(method: string, path: string, kind: ApiErrorKind, status: number, message: string): ApiError {
  if (import.meta.env.DEV) {
    const hint = kind === "network" ? " ← 서버 주소가 틀렸거나, 서버가 이 화면의 주소(출처)를 허용(CORS)하지 않았을 수 있습니다" : "";
    console.warn(`[api] ${method} ${path} → ${kind}${status ? ` (HTTP ${status})` : ""}: ${message}${hint}`);
  }
  return new ApiError(kind, status, message);
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit";
  if (status === 504) return "timeout";
  return "server";
}

export async function request<T>(method: "GET" | "POST", path: string, opts: { body?: unknown; token?: string; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 65000); // 서버 제한 시간은 60초
  try {
    const headers: Record<string, string> = {};
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      let message = "";
      try { message = String((await res.json())?.error ?? ""); } catch { /* 본문이 JSON 이 아님 */ }
      throw fail(method, path, kindFromStatus(res.status), res.status, message || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") throw fail(method, path, "timeout", 0, "시간 초과 (서버가 답하지 않음)");
    throw fail(method, path, "network", 0, String(e));
  } finally {
    clearTimeout(timer);
  }
}

/** 질문하기. 서버가 의도(일반 질문·길 묻기·편의시설)를 나눠서 답한다 */
export const askQuestion = (question: string, language: Lang): Promise<AskResponse> =>
  USE_MOCK ? mock.ask(question, language) : request<AskResponse>("POST", "/api/ask", { body: { question, language } });

/** 고유명사 카드 (b-160 전각, t-24 용어) */
export const fetchCard = (id: string): Promise<CardResponse> =>
  USE_MOCK ? mock.card(id) : request<CardResponse>("GET", `/api/card?id=${encodeURIComponent(id)}`, { timeoutMs: 15000 });

/** 해설 세션 만들기 (가이드 접근 코드 필요) */
export const createSession = (body: SessionCreateBody): Promise<SessionCreated> =>
  USE_MOCK ? mock.createSession(body) : request<SessionCreated>("POST", "/api/sessions", { body, timeoutMs: 20000 });

/** 세션 종료 (가이드 토큰 필요). 종료 요약을 돌려줌 */
export const endSession = (code: string, token: string): Promise<SessionSummary> =>
  USE_MOCK ? mock.endSession(code) : request<SessionSummary>("POST", `/api/sessions/${encodeURIComponent(code)}/end`, { token, timeoutMs: 20000 });

/** 방문 집계(익명, 합계만): 도착 해설(audio)·스탬프(stamp)가 났을 때 장소 id·언어·날짜만 보냄. 위치 좌표는 x
 *  실패해도 앱 동작에는 영향이 없음(개발 중에는 콘솔에 이유가 남음) */
export async function sendVisit(poiId: string, event: "audio" | "stamp", lang: Lang): Promise<void> {
  if (USE_MOCK) return;
  const date = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (오늘)
  try {
    await request<void>("POST", "/api/stats/visits", { body: { poiId, event, lang, date }, timeoutMs: 10000 });
  } catch { /* 집계 실패는 무시 */ }
}

/** 세션 정보(상태·제목·해설사). 서버가 연결되지 않은(가짜 서버) 상태에서는 null */
export async function fetchSession(code: string): Promise<SessionInfo | null> {
  if (USE_MOCK) return null;
  return normalizeSession(await request<unknown>("GET", `/api/sessions/${encodeURIComponent(code)}`, { timeoutMs: 15000 }), code);
}

/** 세션 종료 요약(진행 시간, 최대 참여자, 언급된 카드). 가짜 서버 상태에서는 null */
export async function fetchSessionSummary(code: string): Promise<SessionSummary | null> {
  if (USE_MOCK) return null;
  return request<SessionSummary>("GET", `/api/sessions/${encodeURIComponent(code)}/summary`, { timeoutMs: 15000 });
}

/** 오늘의 해설 일정(T-30). 가짜 서버 상태에서는 null */
export async function fetchToursToday(): Promise<TourRow[] | null> {
  if (USE_MOCK) return null;
  return normalizeTours(await request<unknown>("GET", "/api/tours/today", { timeoutMs: 15000 }));
}
