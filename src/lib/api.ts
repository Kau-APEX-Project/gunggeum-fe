import { ApiError, type ApiErrorKind, type AskResponse, type CardResponse, type SessionCreateBody, type SessionCreated, type SessionSummary } from "@/lib/apiTypes";
import type { Lang } from "@/lib/language";
import * as mock from "@/lib/mockApi";

// 백엔드 서버 연결 모듈. 서버 주소는 .env 의 VITE_API_BASE 한 줄로만 정한다
// 비어 있으면 가짜 서버로 동작
const base = String(import.meta.env.VITE_API_BASE ?? "").trim().replace(/\/+$/, "");
export const USE_MOCK = base === "";
if (USE_MOCK && import.meta.env.DEV) {
  console.info("[api] VITE_API_BASE 가 비어 있어 가짜 서버(mock)로 동작합니다.");
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

async function request<T>(method: "GET" | "POST", path: string, opts: { body?: unknown; token?: string; timeoutMs?: number } = {}): Promise<T> {
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
      throw new ApiError(kindFromStatus(res.status), res.status, message || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") throw new ApiError("timeout", 0, "timeout");
    throw new ApiError("network", 0, String(e));
  } finally {
    clearTimeout(timer);
  }
}

/** 질문하기. 서버가 의도(일반 질문·길 묻기·편의시설)를 나눠서 답한다. */
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
