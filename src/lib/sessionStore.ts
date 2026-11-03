import { useSyncExternalStore } from "react";
import type { SessionSummary } from "@/lib/apiTypes";

// 해설사가 만든 세션 정보를 이 기기에만 보관하는 곳
// 가이드 토큰은 마이크·종료를 제어하는 열쇠라서 주소(URL)에는 넣지 않고 탭을 닫으면 사라지는 sessionStorage 에만 둔다
export type GuideSession = { code: string; joinUrl: string; guideToken: string; title: string; startedAt: string };

const KEY = "gunggeum.guideSession";
function read(): GuideSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GuideSession) : null;
  } catch { return null; }
}

let session: GuideSession | null = read();
let summary: SessionSummary | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function saveSession(next: GuideSession) {
  session = next;
  summary = null;
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 저장 못 해도 이번 화면에서는 동작 */ }
  emit();
}
export function saveSummary(next: SessionSummary) { summary = next; emit(); }
export function clearSession() {
  session = null;
  summary = null;
  try { sessionStorage.removeItem(KEY); } catch { /* 무시 */ }
  emit();
}

export const useGuideSession = () => useSyncExternalStore(subscribe, () => session);
export const useGuideSummary = () => useSyncExternalStore(subscribe, () => summary);
