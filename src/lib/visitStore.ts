import { useSyncExternalStore } from "react";
import { sendVisit } from "@/lib/api";
import { assetUrl } from "@/lib/assets";
import { getLanguage } from "@/lib/language";
import { SHOW_PROTOTYPE } from "@/lib/prototype";
import { createJudge, distToPolygon, type Judge, type JudgeEvent, type JudgeFix, type JudgePoi } from "@/visit/judge.mjs";

// GPS 방문 판정 연결부
//   휴대폰 위치(watchPosition) > BE 의 판정 모듈(judge.mjs) → 이벤트
//   audio = 한 곳에 7초 머묾 > 도착 알림(T-13),  stamp = 25초 머묾 > 여권 스탬프
// 위치는 기기 안에서만 쓰고 서버로 보내지 않음. 서버에는 "어느 장소에서 도착/스탬프가 났는지" 합계용으로만 보냄

type Zones = { features: { properties: { id: string }; geometry: { coordinates: number[][][] } }[] };
export type VisitEvent = JudgeEvent;

export type VisitSnapshot = {
  tracking: "off" | "starting" | "on";
  permission: "unknown" | "granted" | "denied" | "unavailable";
  weakGps: boolean;                              // 위치 정확도가 계속 나쁨 (S-03)
  accuracy: number | null;                       // 마지막 위치의 정확도(m)
  visited: string[];                             // 스탬프를 받은 장소 id (앱을 껐다 켜도 유지)
  arrival: { poiId: string; t: number } | null;  // 도착 알림 대기 (T-13 에서 사용)
};

const KEY = "gunggeum.visit";
const WEAK_ACCURACY = 25; // m. judge.mjs 의 maxAccuracy 와 같은 기준
const WEAK_STREAK = 5;    // 나쁜 샘플이 연속 5번이면 "위치가 불확실"

type Saved = { visited?: string[]; lastAudio?: Record<string, number> };
function readSaved(): Saved {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saved; } catch { return {}; }
}

let snap: VisitSnapshot = { tracking: "off", permission: "unknown", weakGps: false, accuracy: null, visited: readSaved().visited ?? [], arrival: null };
const listeners = new Set<() => void>();
function set(patch: Partial<VisitSnapshot>) {
  snap = { ...snap, ...patch };
  listeners.forEach((l) => l());
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useVisit = () => useSyncExternalStore(subscribe, () => snap);
export const getVisit = () => snap;
export const clearArrival = () => set({ arrival: null });

/**
 * 도착 알림에 보여 줄 "대표 장소"를 고름
 * 같은 마당을 쓰는 장소(근정전·근정전 조정·근정전 내부)는 핀 좌표가 같아서 판정이 그중 아무거나 고를 수 있는데
 * pois.json 의 group 이 대표 전각 이름이라서 그쪽(근정전)으로 바꿔 보여줌
 */
export function representative<T extends { id: string; ko: string; group: string }>(places: T[], poiId: string): T | undefined {
  const place = places.find((p) => p.id === poiId);
  if (!place) return undefined;
  return places.find((p) => p.ko === place.group && p.group === p.ko) ?? place;
}

// 이벤트 구독 (도착 알림 이동, 스탬프 안내 문구 등을 화면 쪽에서 처리)
const eventListeners = new Set<(e: VisitEvent) => void>();
export function onVisitEvent(fn: (e: VisitEvent) => void) {
  eventListeners.add(fn);
  return () => { eventListeners.delete(fn); };
}

// ---------- 판정기 준비 (판정 영역 + 장소 데이터) ----------
let judge: Judge | null = null;
let zonesData: Zones | null = null;
let poisData: JudgePoi[] = [];
let preparing: Promise<void> | null = null;

function prepare() {
  if (!preparing) {
    preparing = (async () => {
      const [zr, pr] = await Promise.all([fetch(assetUrl("visit/data/zones.geojson")), fetch(assetUrl("visit/data/pois.json"))]);
      if (!zr.ok || !pr.ok) throw new Error("방문 판정 데이터를 불러오지 못했습니다 (visit/data/zones.geojson, pois.json)");
      zonesData = (await zr.json()) as Zones;
      poisData = (await pr.json()) as JudgePoi[];
      judge = createJudge(zonesData, poisData, {}, readSaved());
    })().catch((e) => { preparing = null; throw e; });
  }
  return preparing;
}

// ---------- 위치 한 번(샘플)을 처리 ----------
let badStreak = 0;
function noteAccuracy(accuracy: number) {
  const rounded = Math.round(accuracy);
  if (rounded !== snap.accuracy) set({ accuracy: rounded });
  if (accuracy > WEAK_ACCURACY) {
    badStreak++;
    if (badStreak >= WEAK_STREAK && !snap.weakGps) set({ weakGps: true });
  } else {
    badStreak = 0;
    if (snap.weakGps) set({ weakGps: false });
  }
}

function persist() {
  if (!judge) return;
  try { localStorage.setItem(KEY, JSON.stringify(judge.saved())); } catch { /* 저장 못 해도 이번 실행에서는 동작 */ }
}

function handleFix(fix: JudgeFix) {
  noteAccuracy(fix.accuracy);
  if (!judge) return;
  const events = judge.update(fix);
  if (events.length === 0) return;
  let visited = snap.visited;
  let arrival = snap.arrival;
  for (const e of events) {
    if (e.type === "audio") {
      arrival = { poiId: e.poiId, t: e.t };
      void sendVisit(e.poiId, "audio", getLanguage());
    }
    if (e.type === "stamp") {
      if (!visited.includes(e.poiId)) visited = [...visited, e.poiId];
      void sendVisit(e.poiId, "stamp", getLanguage());
    }
  }
  persist();
  set({ visited, arrival });          // 화면 상태를 먼저 바꾸고
  events.forEach((e) => eventListeners.forEach((l) => l(e))); // 그다음 구독자에게 알림
}

// ---------- 실제 위치 추적 ----------
let watchId: number | null = null;

function onPosition(pos: GeolocationPosition) {
  if (snap.permission !== "granted") set({ permission: "granted" });
  handleFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, t: pos.timestamp });
}

function onError(err: GeolocationPositionError) {
  if (err.code === err.PERMISSION_DENIED) {
    stopVisitTracking();
    set({ permission: "denied" });
  } else {
    set({ weakGps: true }); // 신호 없음·시간 초과: 위치를 못 잡는 중
  }
}

/** 위치 추적 시작. "Allow location" 버튼을 누를 때 부름 (브라우저가 허용 여부를 물어봄) */
export async function startVisitTracking(): Promise<void> {
  if (snap.tracking !== "off") return;
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) { set({ permission: "unavailable" }); return; }
  set({ tracking: "starting" });
  try {
    await prepare();
  } catch (e) {
    console.error("[visit] 판정기 준비 실패", e);
    set({ tracking: "off" });
    return;
  }
  watchId = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
  set({ tracking: "on" });
}

export function stopVisitTracking() {
  if (watchId !== null && typeof navigator !== "undefined") navigator.geolocation.clearWatch(watchId);
  watchId = null;
  set({ tracking: "off", weakGps: false });
}

/** 이미 위치 허용을 해 둔 사람은 지도 홈에 들어올 때 자동으로 추적을 시작 */
export async function ensureVisitTracking(): Promise<void> {
  if (snap.tracking !== "off") return;
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" });
    if (status?.state === "granted") await startVisitTracking();
    else if (status?.state === "denied") set({ permission: "denied" });
  } catch { /* 권한 조회를 못 하는 브라우저: Allow location 을 누를 때 시작됩니다 */ }
}

// ---------- 개발·시연용: 가짜로 걸어 들어가기 (PC 에서 확인) ----------
// 진짜 위치 대신 한 장소 안의 좌표를 1초마다 넣어 같은 판정 경로(handleFix)로 도착·스탬프를 만듦
function interiorPoint(rings: number[][][], pin?: [number, number]): [number, number] {
  if (pin && distToPolygon(pin, rings) === 0) return pin;
  const ring = rings[0];
  const c: [number, number] = [ring.reduce((a, v) => a + v[0], 0) / ring.length, ring.reduce((a, v) => a + v[1], 0) / ring.length];
  if (distToPolygon(c, rings) === 0) return c;
  const xs = ring.map((v) => v[0]), ys = ring.map((v) => v[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let i = 1; i < 20; i++) for (let j = 1; j < 20; j++) {
    const p: [number, number] = [x0 + ((x1 - x0) * i) / 20, y0 + ((y1 - y0) * j) / 20];
    if (distToPolygon(p, rings) === 0) return p;
  }
  return c;
}

let fakeTimer: ReturnType<typeof setInterval> | null = null;
export function stopFakeWalk() { if (fakeTimer) clearInterval(fakeTimer); fakeTimer = null; }

export async function fakeWalk(poiId: string, opts: { seconds?: number; stepMs?: number } = {}): Promise<void> {
  const { seconds = 40, stepMs = 1000 } = opts;
  await prepare();
  const poi = poisData.find((p) => p.id === poiId);
  const zone = zonesData?.features.find((f) => f.properties.id === poi?.zoneIds[0]);
  if (!poi || !zone) { console.warn("[visit] fakeWalk: 알 수 없는 장소", poiId); return; }
  const [lng, lat] = interiorPoint(zone.geometry.coordinates, poi.pin);
  stopFakeWalk();
  const start = Date.now();
  let tick = 0;
  fakeTimer = setInterval(() => {
    handleFix({ lat, lng, accuracy: 8, t: start + tick * 1000 }); // 시각은 1초씩 흐른 것으로 계산
    if (++tick > seconds) stopFakeWalk();
  }, stepMs);
}

/** 개발용: 스탬프·도착 기록을 지우고 처음부터 다시 시험 */
export function resetVisits() {
  stopFakeWalk();
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
  judge = null;
  preparing = null;
  set({ visited: [], arrival: null, weakGps: false, accuracy: null });
}

// 브라우저 콘솔(F12)에서 시험: gunggeumVisit.fakeWalk("place:geunjeongjeon-hall")
if (SHOW_PROTOTYPE && typeof window !== "undefined") {
  Object.assign(window, { gunggeumVisit: { fakeWalk, stopFakeWalk, reset: resetVisits } });
}
