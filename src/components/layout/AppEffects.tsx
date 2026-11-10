import { useEffect } from "react";
import { VisitWatcher } from "@/components/layout/VisitWatcher";
import { useApp } from "@/context/AppContext";
import { getLanguage } from "@/lib/language";
import { parseLiveCode } from "@/lib/liveProtocol";
import { joinLive } from "@/lib/liveStore";

// 화면에 보이지 않지만 앱 전체에서 한 번만 돌아야 하는 일들을 모아 둔 부품(App 안에 한 번만 둠)
//  1) 방문 판정 이벤트 처리 (VisitWatcher)
//  2) QR 로 들어온 주소(/live/GB-1042) 처리: 세션에 바로 입장해서 자막 화면(T-31)으로
export function AppEffects() {
  const { go } = useApp();
  useEffect(() => {
    const code = parseLiveCode(window.location.pathname);
    if (!code) return;
    window.history.replaceState(null, "", "/");
    joinLive(code, getLanguage()).then((result) => go(result === "ended" ? "T-32" : "T-31"));
  }, []);
  return <VisitWatcher />;
}
