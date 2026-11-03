// 시안 확인용 요소를 보일지 정하는 스위치
// 기본값: pnpm dev (개발) > 보임 / pnpm build 로 만든 배포본 > 숨김
// 바꾸고 싶으면 .env 에 VITE_SHOW_PROTOTYPE=true (항상 보임) 또는 false (항상 숨김) 를 적고 다시 실행
// 데모 배포 시 빌드할 때 VITE_SHOW_PROTOTYPE=true
export function resolveShowPrototype(flag: unknown, dev: boolean): boolean {
  const v = String(flag ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(v)) return true;
  if (["false", "0", "no", "off"].includes(v)) return false;
  return dev;
}

export const SHOW_PROTOTYPE = resolveShowPrototype(import.meta.env.VITE_SHOW_PROTOTYPE, import.meta.env.DEV);

// 배포 모드에서는 바깥 회색 배경도 흰색으로 (스타일은 styles/production.css)
if (!SHOW_PROTOTYPE && typeof document !== "undefined") {
  document.documentElement.classList.add("production-mode");
}
