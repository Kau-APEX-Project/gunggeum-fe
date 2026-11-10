// src/visit/judge.mjs 는 자바스크립트 파일이라 타입이 없습니다. 사용하는 부분의 모양만 적어둠
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
