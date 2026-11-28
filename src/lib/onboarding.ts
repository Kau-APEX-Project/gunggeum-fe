// 온보딩(시작 > 언어 > 위치 안내)을 한 번 끝냈는지 기억함
const KEY = "gunggeum.onboarded";

export function isOnboarded(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function markOnboarded() {
  try { localStorage.setItem(KEY, "1"); } catch { /* 저장 못 해도 동작에는 문제없음 */ }
}
