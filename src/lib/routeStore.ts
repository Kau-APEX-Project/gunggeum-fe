import { USE_MOCK, request } from "@/lib/api";
import { assetUrl } from "@/lib/assets";
import { buildGraph, fitCourse, nearestAmenities, nearestNode, routeTo, type Graph, type RoutePath } from "@/visit/route.mjs";

// 길 계산과 코스 만들기를 맡는 파일
//   데이터: servermap/data/paths.geojson(보행 길) · pins.geojson(편의시설) · places.geojson(자연 지점) · visit/data/pois.json(전각)
//   계산은 전부 폰 안에서 함 (BE 의 route.mjs). 위치는 서버로 보내지 않음.
//   코스: POST /api/course 로 "순서·체류 분"을 받고 > route.mjs fitCourse 로 실제 걷는 시간을 다시 계산해서 넘치는 곳은 뺌

export type LngLat = [number, number];
export type Name3 = { ko: string; en: string; th: string };
export type RouteStop = {
  id: string;                 // 전각 = pois.json 의 id, 자연 지점 = "nature:이름"
  name: Name3;
  pin: LngLat;
  approachNodes: string[];
  serial: number | null;      // 전각이면 카드 b-<serial>, 자연 지점은 null
  group: string;              // 소속 권역 대표 전각 이름 (도장이 같은 권역에서 찍혔는지 비교용)
  nature: boolean;
};

type Feature = { properties: Record<string, unknown>; geometry: { coordinates: LngLat } };
type PoiRaw = { id: string; name: string; pin: LngLat; approachNodes?: string[]; serial: number; group?: string };
export type RouteData = {
  graph: Graph;
  pins: unknown;                      // pins.geojson 그대로 (nearestAmenities 에 넘김)
  stops: Map<string, RouteStop>;
  gate: RouteStop;                    // 광화문: 코스의 출발·도착 기준
};

const NATURE_KINDS = ["water", "wood", "stream", "spring"];
const GATE_ID = "place:gwanghwamun-gate";
const ON_SITE_M = 1500;               // 광화문에서 이보다 멀면 궁 밖으로 보고 광화문에서 출발한 것으로 계산
const shortName = (s: string) => s.replace(/\s*\(.*\)\s*$/, ""); // "Gwanghwamun (Palace Gate)" > "Gwanghwamun"

export function distM(a: LngLat, b: LngLat): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

let cache: Promise<RouteData> | null = null;
let loaded: RouteData | null = null;
export const getRouteDataNow = () => loaded;

/** 길 데이터를 한 번만 불러와 그래프까지 만들어 둠 (실패하면 다음에 다시 시도) */
export function loadRouteData(): Promise<RouteData> {
  if (!cache) {
    cache = (async () => {
      const get = async (path: string) => {
        const res = await fetch(assetUrl(path));
        if (!res.ok) throw new Error(`${path} 을 불러오지 못했습니다 (HTTP ${res.status})`);
        return res.json();
      };
      const [paths, pois, pins, places] = (await Promise.all([
        get("servermap/data/paths.geojson"), get("visit/data/pois.json"), get("servermap/data/pins.geojson"), get("servermap/data/places.geojson"),
      ])) as [unknown, PoiRaw[], { features: Feature[] }, { features: Feature[] }];
      const graph = buildGraph(paths);

      // 영어·태국어 이름은 pins.geojson 에서 nameId == id 인 핀의 것
      const names = new Map<string, { en: string; th: string }>();
      for (const f of pins.features) {
        const id = f.properties.nameId;
        if (typeof id === "string") names.set(id, { en: String(f.properties["name:en"] ?? ""), th: String(f.properties["name:th"] ?? "") });
      }
      const stops = new Map<string, RouteStop>();
      for (const p of pois) {
        const n = names.get(p.id);
        stops.set(p.id, {
          id: p.id, name: { ko: p.name, en: n?.en ? shortName(n.en) : p.name, th: n?.th ? shortName(n.th) : p.name },
          pin: p.pin, approachNodes: p.approachNodes ?? [], serial: p.serial, group: p.group ?? p.name, nature: false,
        });
      }
      // 자연 지점: places.geojson 에서 kind 가 water·wood·stream·spring 인 곳. 코스 응답의 "nature:이름" 과 이름으로 이어 붙임
      for (const f of places.features) {
        const kind = String(f.properties.kind ?? "");
        const name = String(f.properties.name ?? "");
        if (!NATURE_KINDS.includes(kind) || !name) continue;
        const pin = f.geometry.coordinates;
        const node = nearestNode(graph, pin);
        stops.set(`nature:${name}`, {
          id: `nature:${name}`, name: { ko: name, en: shortName(String(f.properties["name:en"] ?? name)), th: shortName(String(f.properties["name:th"] ?? name)) },
          pin, approachNodes: node ? [node] : [], serial: null, group: name, nature: true,
        });
      }
      const gate = stops.get(GATE_ID);
      if (!gate) throw new Error("pois.json 에 광화문(place:gwanghwamun-gate)이 없습니다");
      loaded = { graph, pins, stops, gate };
      return loaded;
    })().catch((e) => { cache = null; throw e; });
  }
  return cache;
}

/** 출발점: 내 위치가 궁 근처면 그대로, 위치가 없거나 궁 밖이면 광화문 */
export function startPoint(data: RouteData, pos: LngLat | null): { here: LngLat; fromGate: boolean } {
  if (pos && distM(pos, data.gate.pin) <= ON_SITE_M) return { here: pos, fromGate: false };
  return { here: data.gate.pin, fromGate: true };
}

/** 한 곳까지 길 따라 걷는 경로 (거리 m · 시간 분 · 지도에 그릴 좌표). 길이 없으면 null */
export function legTo(data: RouteData, here: LngLat, stop: RouteStop): RoutePath | null {
  return routeTo(data.graph, here, { pin: stop.pin, approachNodes: stop.approachNodes });
}

/** 가까운 편의시설 k 곳 (category = restroom · bench · water) */
export function amenitiesNear(data: RouteData, here: LngLat, category: "restroom" | "bench" | "water", k = 3) {
  return nearestAmenities(data.graph, here, data.pins, category, k);
}

const AMENITY_NAME: Record<string, Name3> = {
  restroom: { ko: "화장실", en: "Restroom", th: "ห้องน้ำ" },
  bench: { ko: "벤치", en: "Bench", th: "ม้านั่ง" },
  water: { ko: "식수대", en: "Drinking water", th: "จุดน้ำดื่ม" },
};

/** 편의시설 한 곳을 길안내 대상으로 바꿈 (도착은 가까이 오면 넘어가도록 nature 와 같은 취급) */
export function amenityStop(data: RouteData, a: { id: string; pin: LngLat }, category: "restroom" | "bench" | "water"): RouteStop {
  const node = nearestNode(data.graph, a.pin);
  return { id: `amenity:${a.id}`, name: AMENITY_NAME[category], pin: a.pin, approachNodes: node ? [node] : [], serial: null, group: category, nature: true };
}

// ---------- 코스 ----------
export type CourseResponse = { answer: string; language: string; course: { minutes: number; stops: { id: string; stayMin: number }[] } };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// 가짜 서버(mock)용 코스: 요청 문장의 시간(분)에 따라 곳 수를 달리함
async function mockCourse(text: string): Promise<CourseResponse> {
  await wait(1500);
  const minutes = Number(/(\d+)\s*min/i.exec(text)?.[1] ?? 60);
  const all = [
    { id: "place:geunjeongjeon-hall", stayMin: 8 }, { id: "place:seojeongjeon", stayMin: 5 }, { id: "place:gyeonghoeru-pavilion", stayMin: 8 },
    { id: "nature:향원지", stayMin: 3 }, { id: "place:hyangwonjeong", stayMin: 6 },
  ];
  const count = minutes >= 90 ? 5 : minutes >= 60 ? 4 : 2;
  return {
    answer: "This is a sample route. [Geunjeongjeon (Throne Hall)](card:b-160) is where state ceremonies were held, and [Gyeonghoeru (Royal Banquet Hall)](card:b-173) stands on a pond.",
    language: "English", course: { minutes, stops: all.slice(0, count) },
  };
}

/** POST /api/course. 서버가 LLM 을 두 번 돌려서 10~20초 걸림 */
export const fetchCourse = (text: string): Promise<CourseResponse> =>
  USE_MOCK ? mockCourse(text) : request<CourseResponse>("POST", "/api/course", { body: { request: text }, timeoutMs: 65000 });

export type PlannedStop = RouteStop & { stayMin: number; walkMin: number; coords: LngLat[] };
export type DroppedStop = { id: string; name: string; reason: "time" | "path" | "unknown" };
export type CoursePlan = {
  request: string;
  answer: string;                       // 코스 소개 글 (card: 링크 포함)
  limitMin: number;                     // 요청에서 읽은 제한 시간(분)
  start: LngLat;
  fromGate: boolean;                    // 내 위치를 몰라 광화문에서 출발한 것으로 계산함
  gate: RouteStop;
  stops: PlannedStop[];                 // 실제 길로 계산해 시간 안에 들어온 곳 (서버가 정한 순서 그대로)
  dropped: DroppedStop[];
  minutes: number;                      // 걷기 + 머무름 + 광화문 복귀
  meters: number;
};

/** 요청 문장 > 서버 코스 > 내 위치 기준으로 실제 길·시간을 다시 계산 */
export async function buildCoursePlan(text: string, pos: LngLat | null): Promise<CoursePlan> {
  const [data, res] = await Promise.all([loadRouteData(), fetchCourse(text)]);
  const { here, fromGate } = startPoint(data, pos);
  const input = res.course.stops.map((s) => {
    const st = data.stops.get(s.id);
    return { id: s.id, pin: st?.pin, approachNodes: st?.approachNodes, stayMin: s.stayMin }; // 모르는 id 는 pin 이 없어 "unknown" 으로 빠짐
  });
  const fit = fitCourse(data.graph, here, input, res.course.minutes, data.gate.pin);
  const stops: PlannedStop[] = fit.stops.map((s) => ({ ...(data.stops.get(s.id) as RouteStop), stayMin: s.stayMin, walkMin: s.walkMin, coords: s.coords }));
  const dropped: DroppedStop[] = fit.dropped.map((d) => ({ id: d.id, name: data.stops.get(d.id)?.name.en ?? d.id, reason: d.reason }));
  return { request: text, answer: res.answer, limitMin: res.course.minutes, start: here, fromGate, gate: data.gate, stops, dropped, minutes: fit.minutes, meters: fit.meters };
}
