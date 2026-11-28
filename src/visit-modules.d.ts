// src/visit/judge.mjs · route.mjs 는 자바스크립트 파일이라 타입이 없음. 사용하는 부분의 모양만 적어 둠
declare module "@/visit/judge.mjs" {
  export type JudgeEvent = { type: "enter" | "audio" | "stamp" | "exit"; poiId: string; t: number };
  export type JudgeFix = { lat: number; lng: number; accuracy: number; t: number };
  export type JudgePoi = { id: string; zoneIds: string[]; pin?: [number, number]; dwellAudioSec?: number; dwellStampSec?: number };
  export type JudgeSaved = { visited?: string[]; lastAudio?: Record<string, number> };
  export type Judge = {
    update(fix: JudgeFix): JudgeEvent[];
    saved(): { visited: string[]; lastAudio: Record<string, number> };
  };
  export const DEFAULTS: Record<string, number>;
  export function createJudge(zones: unknown, pois: JudgePoi[], opts?: Record<string, number>, saved?: JudgeSaved): Judge;
  export function distToPolygon(p: [number, number], rings: number[][][]): number;
}

declare module "@/visit/route.mjs" {
  type LngLat = [number, number];
  export type Graph = { coord: Map<string, LngLat>; adj: Map<string, [string, number][]> };
  export type RoutePath = { meters: number; minutes: number; coords: LngLat[] };
  export type FitInput = { id: string; pin?: LngLat; approachNodes?: string[]; stayMin: number };
  export type FitResult = {
    stops: { id: string; walkMin: number; stayMin: number; coords: LngLat[] }[];
    back: { walkMin: number; coords: LngLat[] } | null;
    minutes: number;
    meters: number;
    dropped: { id: string; reason: "time" | "path" | "unknown" }[];
  };
  export function buildGraph(paths: unknown): Graph;
  export function nearestNode(g: Graph, p: LngLat, filter?: (id: string) => boolean): string | null;
  export function routeTo(g: Graph, here: LngLat, poi: { pin: LngLat; approachNodes: string[] }): RoutePath | null;
  export function nearestAmenities(g: Graph, here: LngLat, pins: unknown, category: string, k?: number, sameM?: number): { id: string; pin: LngLat; meters: number; minutes: number; coords: LngLat[] }[];
  export function fitCourse(g: Graph, here: LngLat, stops: FitInput[], minutes: number, end?: LngLat | null): FitResult;
  export function nextStop(g: Graph, here: LngLat, pois: { id: string; approachNodes: string[] }[], visited: Set<string>): { poiId: string; meters: number; coords: LngLat[] } | null;
  export const minutesOf: (m: number) => number;
}
