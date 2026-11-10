import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { hanbokShops } from "@/data/hanbok";
import { subtitles } from "@/data/subtitles";
import { genSessionCode } from "@/lib/format";
import { runAsk } from "@/lib/askStore";
import type { HbBooking, HbRecord, ScreenId } from "@/types";

function useAppState() {
  const [screen, setScreen] = useState<ScreenId>("T-00");
  const [history, setHistory] = useState<ScreenId[]>([]);
  const [indexOpen, setIndexOpen] = useState(false);
  const [noun, setNoun] = useState<string | null>(null);
  const [audio, setAudio] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(true);
  const [confidence, setConfidence] = useState<"high" | "low">("high");
  const [guideConsent, setGuideConsent] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [original, setOriginal] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [subtitleCount, setSubtitleCount] = useState(2);
  const [query, setQuery] = useState("");
  const [chatQuestion, setChatQuestion] = useState("Why is Gyeonghoeru built on water?");
  const [sessionLive, setSessionLive] = useState(true);
  const [liveSec, setLiveSec] = useState(768);
  const [guideSec, setGuideSec] = useState(1122);
  const [openTour, setOpenTour] = useState<number | null>(null);
  const [langs, setLangs] = useState<string[]>(["English", "Tiếng Việt", "ไทย"]);
  const [duration, setDuration] = useState("90 min");
  const [hanbokHidden, setHanbokHidden] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [routeTime, setRouteTime] = useState("60 min");
  const [routeInterests, setRouteInterests] = useState<string[]>(["Architecture", "Gardens"]);
  const [statesOpen, setStatesOpen] = useState(false);
  const [, setSettingsNote] = useState(false);
  const [hanbokFilters, setHF] = useState<string[]>([]);
  const [shopIdx, setShopIdx] = useState(0);
  const [bk, setBk] = useState<HbBooking>({ date: 0, time: "11:00", duration: "4 hours", adults: 2, children: 0, option: "Classic", acc: [] });
  const [payMethod, setPayMethod] = useState("card");
  const [paying, setPaying] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [hbSave, setHbSave] = useState<"idle" | "saving" | "saved">("idle");
  const [qrCode, setQrCode] = useState("");
  const [sessionCode, setSessionCode] = useState(genSessionCode);
  const [joined, setJoined] = useState(0);
  const [openBk, setOpenBk] = useState<string | null>(null);
  const [cancelAsk, setCancelAsk] = useState<string | null>(null);
  const [lookupMsg, setLookupMsg] = useState("");
  const [bookings, setBookings] = useState<HbRecord[]>([{ code: "HB-4730", shop: "Gungmoon Hanbok", date: "Tue, Oct 6", time: "10:00", people: 2, pickup: "Tue, Oct 6 · 10:00", duration: "Full day", pickupPlace: "Shop near Gyeongbokgung Station, Exit 5", total: 61000, status: "upcoming" }]);
  const streamRef = useRef<HTMLDivElement>(null);

  // 지도 핀이나 목록에서 고른 건물의 id (건물 상세 화면이 이 id 로 정보를 찾음)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const guideMode = screen.startsWith("G-");
  const onboarding = ["T-00", "T-01", "T-02", "T-65A"].includes(screen);
  const cameraScreen = ["T-20", "T-21", "T-22"].includes(screen);

  function go(next: ScreenId, keepIndex = false) {
    // 지도·목록(goToPlace)이 아닌 곳에서 건물 상세로 오면 선택을 비워서 샘플 화면을 보여 줌
    if (next === "T-12") setSelectedPlaceId(null);
    setHistory((items) => [...items, screen]);
    setScreen(next);
    setOpenTour(null);
    if (!keepIndex) setIndexOpen(false);
  }

  function jump(next: ScreenId) {
    if (["T-31", "S-02", "S-04"].includes(next)) setSessionLive(true);
    go(next);
  }

  // 건물을 골라서 상세 화면으로 갈 때 씁니다 (지도 핀, 건물 목록)
  function goToPlace(placeId: string, next: ScreenId = "T-12") {
    go(next);                     // go 는 T-12 로 올 때 선택을 비우고
    setSelectedPlaceId(placeId);  // 바로 이어서 다시 기록합니다 (나중에 호출한 값이 적용됨)
  }

  function setLiveActive(on: boolean) {
    setSessionLive(true);
  }

  function startSession() {
    setSessionLive(true);
    setMicOn(true);
    setGuideSec(0);
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function back() {
    const previous = history.at(-1);
    if (previous) {
      setScreen(previous);
      setHistory((items) => items.slice(0, -1));
    } else go("T-10");
  }

  useEffect(() => {
    if (!sessionLive && ["T-31", "S-02", "S-04"].includes(screen)) go("T-32", true);
  }, [sessionLive, screen]);

  useEffect(() => {
    if (!["T-31", "S-02", "S-04"].includes(screen)) return;
    const timer = window.setInterval(() => setSubtitleCount((count) => Math.min(count + 1, subtitles.length)), 2500);
    return () => window.clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (["T-31", "S-02", "S-04"].includes(screen)) { const t = window.setInterval(() => setLiveSec((n) => n + 1), 1000); return () => window.clearInterval(t); }
    if (screen === "G-02") { setJoined(0); const t = window.setInterval(() => setJoined((n) => Math.min(n + 1, 12)), 2200); return () => window.clearInterval(t); }
    if (screen === "G-03") { const t = window.setInterval(() => setGuideSec((n) => n + 1), 1000); return () => window.clearInterval(t); }
  }, [screen]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [subtitleCount]);

  function openShop(i: number) {
    const offered = Object.keys(hanbokShops[i].prices);
    const wanted = hanbokFilters.find((f) => offered.includes(f));
    setShopIdx(i);
    setBk((b) => ({ ...b, duration: wanted || (offered.includes(b.duration) ? b.duration : offered[0]) }));
    go("T-61");
  }

  // 질문을 서버로 보냅니다. 기다리는 동안은 T-41 에서 로딩을 보여 주고,
  // 답이 오면 T-41(답변) · T-42(근거 없음) · T-43(길 묻기) · T-44(편의시설) · S-06(요청 과다) 중 맞는 화면으로 바꿉니다.
  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    setChatQuestion(q);
    setQuery("");
    if (screen !== "T-41") go("T-41");
    runAsk(q, (next) => setScreen((current) => (current.startsWith("T-4") || current === "S-06" ? next : current)));
  }

  return {
    screen, setScreen, history, setHistory, indexOpen, setIndexOpen, noun, setNoun, audio, setAudio, audioPlaying, setAudioPlaying,
    confidence, setConfidence, guideConsent, setGuideConsent, micOn, setMicOn, original, setOriginal, fontSize, setFontSize,
    subtitleCount, setSubtitleCount, query, setQuery, chatQuestion, setChatQuestion, sessionLive, setSessionLive, liveSec, setLiveSec,
    guideSec, setGuideSec, openTour, setOpenTour, langs, setLangs, duration, setDuration, hanbokHidden, setHanbokHidden,
    servicesOpen, setServicesOpen, toast, setToast, routeTime, setRouteTime, routeInterests, setRouteInterests,
    statesOpen, setStatesOpen, setSettingsNote, hanbokFilters, setHF, shopIdx, setShopIdx, bk, setBk, payMethod, setPayMethod,
    paying, setPaying, newCode, setNewCode, hbSave, setHbSave, qrCode, setQrCode, sessionCode, setSessionCode, joined, setJoined,
    openBk, setOpenBk, cancelAsk, setCancelAsk, lookupMsg, setLookupMsg, bookings, setBookings, streamRef, guideMode, onboarding,
    cameraScreen, go, jump, setLiveActive, startSession, notify, back, openShop, ask,
    selectedPlaceId, setSelectedPlaceId, goToPlace
  };
}

const AppContext = createContext<ReturnType<typeof useAppState> | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppState();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppProvider>");
  return value;
}
