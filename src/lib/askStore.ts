import { useSyncExternalStore } from "react";
import { askQuestion } from "@/lib/api";
import { ApiError, type ApiErrorKind, type AskAction, type AskResponse } from "@/lib/apiTypes";
import { getLanguage } from "@/lib/language";
import type { ScreenId } from "@/types";

// 질의응답(T-40~T-44, S-06)의 대화를 보관하는 곳
// 서버는 질문마다 독립이라(대화 기록 없음) 화면에서만 질문·답변을 차곡차곡 쌓아 보여줌

export type AskKind = "answer" | "noEvidence" | "route" | "amenity";

export type AskTurn = {
  id: number;
  question: string;        // 화면에 보이는 사용자 질문
  sent: string;            // 서버로 실제 보낸 문장 (후속 질문이면 이전 질문이 덧붙음)
  status: "loading" | "done" | "error";
  kind?: AskKind;
  answer?: string;
  action?: AskAction | null;
  errorKind?: ApiErrorKind;
};

const MAX_TURNS = 30;      // 화면에 쌓아 두는 최대 질문 수
let turns: AskTurn[] = [];
let nextId = 0;
let chatGen = 0;           // 새 대화를 시작하면 올라가는 번호 (이전 대화의 늦은 응답은 무시)
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function setTurns(next: AskTurn[]) { turns = next; emit(); }
function patchTurn(id: number, patch: Partial<AskTurn>) { setTurns(turns.map((t) => (t.id === id ? { ...t, ...patch } : t))); }
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export const useAskTurns = () => useSyncExternalStore(subscribe, () => turns);
export const useAskTurn = () => useSyncExternalStore(subscribe, () => turns[turns.length - 1] ?? null); // 가장 최근 질문
export const getAskTurn = () => turns[turns.length - 1] ?? null;
export const getAskTurns = () => turns;

/** 새 대화를 시작 (지금까지 쌓인 질문·답변을 비움) */
export function clearChat() {
  chatGen++;
  setTurns([]);
}

const CARD_LINK = /\]\(card:[bt]-\d+\)/;

/**
 * 서버 응답이 어떤 화면에 해당하는지 나눔
 * 길 묻기·편의시설은 서버가 action 으로 알려줌
 * "근거 없음"은 서버가 따로 표시를 주지 않아 임시 규칙을 사용: 답변에 카드 링크가 하나도 없으면 근거 없음
 */
export function classify(r: AskResponse): AskKind {
  if (r.action?.type === "route") return "route";
  if (r.action?.type === "amenity") return "amenity";
  return CARD_LINK.test(r.answer) ? "answer" : "noEvidence";
}

export const screenFor = (kind: AskKind): ScreenId =>
  kind === "route" ? "T-43" : kind === "amenity" ? "T-44" : kind === "noEvidence" ? "T-42" : "T-41";

// ---------- 후속 질문 (임시 방법) ----------
// 서버에 대화 기록이 없어서 이것저것 기억하지 못 함
// 서버가 history 를 받게 되면 false 로 바꾸고 history 를 보내는 방식으로 교체(우선 false로 해둠)
export const FOLLOW_UP_CONTEXT = false;

const FOLLOW_EN = /^(and|also|then|so|what about|how about|what else|why|how come|tell me more|more|is it|was it|does it|did it|can it|is that|was that)\b/i;
const PRONOUN_EN = /\b(it|its|it's|that|they|them|their|he|she|his|her|those|these)\b/i;
const FOLLOW_KO = /^(그럼|그러면|그리고|그런데|그건|그게|거기|그곳|이건|이게|왜|언제|누가|더)/;
const PRONOUN_KO = /(그것|거기|그곳|이것|저것|그건|그게)/;
const INTENT_WORDS = /toilet|restroom|bench|drinking water|water fountain|get to|how do i get|where is|directions|화장실|벤치|식수대|가는 길|어떻게 가/i;

export function isFollowUp(q: string): boolean {
  const s = q.trim();
  if (s.length === 0 || s.length > 60) return false;
  if (INTENT_WORDS.test(s)) return false;                // 길 묻기·편의시설은 이전 질문과 무관
  if (/\b[A-Z][a-z]{3,}/.test(s.slice(1))) return false; // 건물 이름 등 고유명사가 직접 들어 있으면 독립 질문
  return FOLLOW_EN.test(s) || PRONOUN_EN.test(s) || FOLLOW_KO.test(s) || PRONOUN_KO.test(s);
}

/** 서버로 보낼 문장을 만듦 (서버 제한 300자 이내) */
export function buildQuestion(q: string, prev: AskTurn | null, enabled = FOLLOW_UP_CONTEXT): string {
  if (!enabled || !prev || prev.status !== "done" || !isFollowUp(q)) return q;
  const room = 300 - q.length - 4; // " (" + ")" 와 여유
  if (room < 10) return q;
  const context = prev.question.length > room ? prev.question.slice(0, room) : prev.question;
  return `${q} (${context})`;
}

// ---------- 질문 보내기 ----------
function request(id: number, gen: number, onResult: (screen: ScreenId) => void) {
  const turn = turns.find((t) => t.id === id);
  if (!turn) return;
  if (import.meta.env.DEV && turn.sent !== turn.question) console.info("[ask] 후속 질문으로 보냄:", turn.sent);
  askQuestion(turn.sent, getLanguage())
    .then((r) => {
      if (gen !== chatGen) return;
      const kind = classify(r);
      patchTurn(id, { status: "done", kind, answer: r.answer, action: r.action, errorKind: undefined });
      if (turns[turns.length - 1]?.id === id) onResult(screenFor(kind)); // 가장 최근 질문의 답만 화면을 바꿈
    })
    .catch((e) => {
      if (gen !== chatGen) return;
      const errorKind: ApiErrorKind = e instanceof ApiError ? e.kind : "network";
      patchTurn(id, { status: "error", errorKind });
      if (turns[turns.length - 1]?.id === id) onResult(errorKind === "rate_limit" ? "S-06" : "T-41");
    });
}

/**
 * 질문을 보냄. 기다리는 동안 그 질문은 "loading" 이고 가장 최근 질문의 답이 오면 어느 화면으로 갈지 onResult 로 알려 준다
 * opts.fresh = true 면 새 대화로 시작(T-40 이나 건물 상세·카메라에서 처음 묻는 경우)
 */
export function runAsk(question: string, onResult: (screen: ScreenId) => void, opts: { fresh?: boolean } = {}) {
  if (opts.fresh) clearChat();
  const prev = [...turns].reverse().find((t) => t.status === "done") ?? null;
  const turn: AskTurn = { id: ++nextId, question, sent: buildQuestion(question, prev), status: "loading" };
  setTurns([...turns, turn].slice(-MAX_TURNS));
  request(turn.id, chatGen, onResult);
}

/** 실패한 질문 하나를 같은 문장으로 다시 보냄 */
export function retryTurn(id: number, onResult: (screen: ScreenId) => void) {
  patchTurn(id, { status: "loading", errorKind: undefined });
  request(id, chatGen, onResult);
}
