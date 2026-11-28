import { useSyncExternalStore } from "react";
import { distM, legTo, loadRouteData, startPoint, type CoursePlan, type LngLat, type RouteData, type RouteStop } from "@/lib/routeStore";
import { onVisitEvent } from "@/lib/visitStore";

// 길안내(T-16) 진행 상태를 보관하는 파일
//   plan: T-14 에서 만든 코스 (T-15 결과 화면이 읽음)
//   steps: 안내할 순서 = 코스의 곳들 + 마지막에 광화문 복귀. 한 곳만 안내할 때는 그 한 곳.
//   다음 곳으로 넘어가는 조건
//     모든 곳: 그 곳의 핀 또는 경로의 도착 지점에서 30m 안으로 들어옴
//     전각: 위와 별개로 방문 판정의 스탬프(25초 머묾)가 그 곳(또는 같은 권역)에서 나와도 넘어감
//       (스탬프는 장소마다 한 번만 나오므로, 이미 받은 곳은 거리 조건으로만 넘어감)
//     사용자가 Skip 을 누름
//   위치는 화면(Navigation)이 updatePosition 으로 넣어 줌

export type NavStep = RouteStop & { stayMin: number };
export type NavLeg = { coords: LngLat[]; meters: number; minutes: number };
export type NavState = {
  plan: CoursePlan | null;
  steps: NavStep[];
  idx: number;
  leg: NavLeg | null;                // 지금 가는 곳까지의 경로
  status: "idle" | "loading" | "active" | "finished" | "error";
};

const ARRIVE_M = 30;                 // 도착으로 보는 거리
const REROUTE_M = 8;                 // 이만큼 움직이면 경로를 다시 계산

let state: NavState = { plan: null, steps: [], idx: 0, leg: null, status: "idle" };
const listeners = new Set<() => void>();
function set(patch: Partial<NavState>) { state = { ...state, ...patch }; listeners.forEach((l) => l()); }
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useNav = () => useSyncExternalStore(subscribe, () => state);
export const getNav = () => state;

let data: RouteData | null = null;
let me: LngLat | null = null;        // 마지막으로 받은 내 위치
let legFrom: LngLat | null = null;   // 경로를 마지막으로 계산한 위치
let unsubVisit: (() => void) | null = null;

/** T-14 에서 만든 코스를 T-15 가 보여 주도록 저장 */
export function setPlan(plan: CoursePlan | null) {
  if (state.status === "active") endNavigation();
  set({ plan, steps: [], idx: 0, leg: null, status: "idle" });
}

function recompute() {
  const step = state.steps[state.idx];
  if (!data || !step) return;
  const { here } = startPoint(data, me ?? state.plan?.start ?? null);
  legFrom = here;
  const r = legTo(data, here, step);
  set({ leg: r ? { coords: r.coords, meters: r.meters, minutes: r.minutes } : null });
}

function begin(steps: NavStep[]) {
  unsubVisit?.();
  unsubVisit = onVisitEvent((e) => {
    if (e.type !== "stamp" || state.status !== "active") return;
    const step = state.steps[state.idx];
    if (step && !step.nature && stampMatches(step, e.poiId)) advance();
  });
  set({ steps, idx: 0, leg: null, status: "active" });
  recompute();
}

// 도장이 찍힌 장소가 지금 가는 곳(또는 같은 권역)인지
function stampMatches(step: NavStep, poiId: string): boolean {
  if (poiId === step.id) return true;
  const poi = data?.stops.get(poiId);
  return !!poi && poi.group === step.name.ko;
}

/** T-15 의 "Start navigation": 코스 전체 안내 시작 */
export async function startNavigation() {
  const plan = state.plan;
  if (!plan || plan.stops.length === 0) return;
  set({ status: "loading" });           // 화면이 예시 문장이 아니라 "경로 찾는 중"을 보이도록 먼저 표시
  data = await loadRouteData();
  const steps: NavStep[] = plan.stops.map((s) => ({ ...s }));
  steps.push({ ...plan.gate, stayMin: 0 }); // 마지막은 광화문으로 복귀
  begin(steps);
}

/** 한 곳만 안내 (건물 상세의 Navigate here, 채팅의 길 묻기). placeId = pois.json 의 id */
export async function navigateTo(placeId: string) {
  set({ plan: null, steps: [], idx: 0, leg: null, status: "loading" });
  try {
    data = await loadRouteData();
    const stop = data.stops.get(placeId);
    if (!stop) { set({ status: "error" }); return; }
    begin([{ ...stop, stayMin: 0 }]);
  } catch (e) {
    console.warn("[nav] 길 데이터를 불러오지 못했습니다", e);
    set({ status: "error" });
  }
}

/** 이미 만들어 둔 대상 하나를 안내 (근처 편의시설) */
export async function navigateToStop(stop: RouteStop) {
  set({ plan: null, steps: [], idx: 0, leg: null, status: "loading" });
  try {
    data = await loadRouteData();
    begin([{ ...stop, stayMin: 0 }]);
  } catch (e) {
    console.warn("[nav] 길 데이터를 불러오지 못했습니다", e);
    set({ status: "error" });
  }
}

export function advance() {
  if (state.status !== "active") return;
  const next = state.idx + 1;
  if (next >= state.steps.length) { set({ idx: state.steps.length - 1, leg: null, status: "finished" }); return; }
  set({ idx: next });
  recompute();
}

export function endNavigation() {
  unsubVisit?.();
  unsubVisit = null;
  set({ steps: [], idx: 0, leg: null, status: "idle" });
}

/** 지금 가는 곳에 도착했는지: 핀, 또는 경로가 끝나는 지점(approach node) 중 하나가 ARRIVE_M 안 (큰 건물은 핀이 멀 수 있음) */
function reached(step: NavStep, pos: LngLat): boolean {
  if (distM(pos, step.pin) <= ARRIVE_M) return true;
  const coord = data?.graph.coord;
  return !!coord && step.approachNodes.some((id) => { const c = coord.get(id); return !!c && distM(pos, c) <= ARRIVE_M; });
}

/** 화면이 내 위치가 바뀔 때마다 부름 */
export function updatePosition(pos: LngLat) {
  me = pos;
  if (state.status !== "active") return;
  const step = state.steps[state.idx];
  if (!step) return;
  if (reached(step, pos)) { advance(); return; }
  if (!legFrom || distM(pos, legFrom) >= REROUTE_M) recompute();
}
