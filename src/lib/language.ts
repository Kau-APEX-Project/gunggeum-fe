import { useSyncExternalStore } from "react";

// 관광객이 T-01 에서 고른 언어. 서버 요청(language)과 상단 바 칩(EN/TH)에 사용된다
export type Lang = "en" | "th";

const KEY = "gunggeum.lang";
function read(): Lang {
  try { return localStorage.getItem(KEY) === "th" ? "th" : "en"; } catch { return "en"; }
}

let current: Lang = read();
const listeners = new Set<() => void>();

export const getLanguage = () => current;
export function setLanguage(next: Lang) {
  current = next;
  try { localStorage.setItem(KEY, next); } catch { /* 저장 못 해도 동작에는 문제없음 */ }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useLanguage = () => useSyncExternalStore(subscribe, getLanguage);

export const languageLabel: Record<Lang, string> = { en: "EN", th: "TH" };
