import { useSyncExternalStore } from "react";
import { askQuestion } from "@/lib/api";
import { ApiError, type ApiErrorKind, type AskAction, type AskResponse } from "@/lib/apiTypes";
import { getLanguage } from "@/lib/language";
import type { ScreenId } from "@/types";

// 질의응답(T-40~T-44, S-06)의 "지금 질문과 답" 상태를 보관하는 곳
// 질문마다 독립이고(서버에 대화 기록이 없음) 화면에는 가장 최근 질문 하나만 보여줌

export type AskKind = "answer" | "noEvidence" | "route" | "amenity";

export type AskTurn = {
  question: string;
  status: "loading" | "done" | "error";
  kind?: AskKind;
  answer?: string;
  action?: AskAction | null;
  errorKind?: ApiErrorKind;
};

let turn: AskTurn | null = null;
let seq = 0; // 새 질문이 들어오면 이전 질문의 늦은 응답은 무시하기 위한 번호
const listeners = new Set<() => void>();
function set(next: AskTurn | null) { turn = next; listeners.forEach((l) => l()); }
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useAskTurn = () => useSyncExternalStore(subscribe, () => turn);
export const getAskTurn = () => turn;

const CARD_LINK = /\]\(card:[bt]-\d+\)/;

/**
 * 서버 응답이 어떤 화면에 해당하는지 나눔
 * 길 묻기·편의시설은 서버가 action 으로 알려주며
 * 근거 없음은 서버가 따로 표시를 주지 않아 임시 규칙을 사용: 답변에 카드 링크가 하나도 없으면 근거 없음
 * 이후 논의 결과에 따라 함수 수정!!
 */
export function classify(r: AskResponse): AskKind {
  if (r.action?.type === "route") return "route";
  if (r.action?.type === "amenity") return "amenity";
  return CARD_LINK.test(r.answer) ? "answer" : "noEvidence";
}

export const screenFor = (kind: AskKind): ScreenId =>
  kind === "route" ? "T-43" : kind === "amenity" ? "T-44" : kind === "noEvidence" ? "T-42" : "T-41";

/**
 * 질문을 보냄. 기다리는 동안 turn.status 는 "loading" 이고
 * 결과가 오면 어느 화면으로 갈지 onResult 로 알려준다
 */
export function runAsk(question: string, onResult: (screen: ScreenId) => void) {
  const id = ++seq;
  set({ question, status: "loading" });
  askQuestion(question, getLanguage())
    .then((r) => {
      if (id !== seq) return;
      const kind = classify(r);
      set({ question, status: "done", kind, answer: r.answer, action: r.action });
      onResult(screenFor(kind));
    })
    .catch((e) => {
      if (id !== seq) return;
      const errorKind: ApiErrorKind = e instanceof ApiError ? e.kind : "network";
      set({ question, status: "error", errorKind });
      onResult(errorKind === "rate_limit" ? "S-06" : "T-41");
    });
}
