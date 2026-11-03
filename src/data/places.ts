import { useEffect, useState } from "react";
import { assetUrl } from "@/lib/assets";

export type Place = {
  id: string;
  serial: number;
  ko: string;
  en: string;
  th: string;
  category: string;  // gate, hall ...
  group: string;     // 소속 권역의 대표 전각 이름 (자기 자신이면 대표 전각)
  lng: number;
  lat: number;
};

// 지도·목록에 보일 장소 id. 비워 두면 pois.json 전체를 보임
// id를 채우면 지도와 목록이 함께 줄어듦
export const FEATURED_PLACE_IDS: string[] = [];
export const isFeatured = (p: Place) =>
  FEATURED_PLACE_IDS.length === 0 || FEATURED_PLACE_IDS.includes(p.id);

const TYPE_LABELS: Record<string, string> = { gate: "Gate", hall: "Hall" };
export const typeLabel = (category: string) =>
  TYPE_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);

type PoiRaw = { id: string; name: string; category: string; pin: [number, number]; serial: number; group?: string };
type PinFeature = { properties?: { nameId?: string; "name:en"?: string; "name:th"?: string } };

// "Gwanghwamun (Palace Gate)" → "Gwanghwamun"
const shortName = (s: string) => s.replace(/\s*\(.*\)\s*$/, "");

let cache: Promise<Place[]> | null = null;

// pois.json(한글명·좌표)과 pins.geojson(영어·태국어 이름)을 id ↔ nameId 로 이어 붙임
export function loadPlaces(): Promise<Place[]> {
  if (!cache) {
    cache = (async () => {
      const [poisRes, pinsRes] = await Promise.all([
        fetch(assetUrl("visit/data/pois.json")),
        fetch(assetUrl("servermap/data/pins.geojson")),
      ]);
      if (!poisRes.ok || !pinsRes.ok) throw new Error("장소 데이터를 불러오지 못했습니다");
      const pois: PoiRaw[] = await poisRes.json();
      const pins: { features: PinFeature[] } = await pinsRes.json();

      const names = new Map<string, { en: string; th: string }>();
      for (const f of pins.features) {
        const p = f.properties;
        if (p?.nameId) names.set(p.nameId, { en: p["name:en"] ?? "", th: p["name:th"] ?? "" });
      }
      return pois.map((poi) => {
        const n = names.get(poi.id);
        return {
          id: poi.id,
          serial: poi.serial,
          ko: poi.name,
          en: n?.en ? shortName(n.en) : poi.name,
          th: n?.th ?? "",
          category: poi.category,
          group: poi.group ?? poi.name,
          lng: poi.pin[0],
          lat: poi.pin[1],
        };
      });
    })().catch((err) => {
      cache = null; // 실패하면 다음에 다시 시도
      throw err;
    });
  }
  return cache;
}

export function usePlaces() {
  const [state, setState] = useState<{ places: Place[]; status: "loading" | "ready" | "error" }>({
    places: [],
    status: "loading",
  });
  useEffect(() => {
    let off = false;
    loadPlaces()
      .then((places) => !off && setState({ places, status: "ready" }))
      .catch(() => !off && setState({ places: [], status: "error" }));
    return () => { off = true; };
  }, []);
  return state;
}
