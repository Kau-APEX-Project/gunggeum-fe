import { useEffect, useRef, useState } from "react";
import * as maplibre from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useApp } from "@/context/AppContext";
import { assetUrl } from "@/lib/assets";
import { isFeatured, usePlaces, type Place } from "@/data/places";

const ml = ((maplibre as any).default ?? maplibre) as typeof maplibre;

const SRC = "gg-places";
const LABEL_MIN_ZOOM = 16.5; 
const HIDDEN_LAYERS = new Set(["osm-ways-line", "user-pins-circle"]);

let ready = false;
function initMapLibre() {
  if (ready) return;
  ml.setWorkerUrl(workerUrl);                               // 워커 파일 위치 (지도를 만들기 전에 한 번)
  ml.addProtocol("pmtiles", new Protocol().tile as any);    // pmtiles:// 주소를 읽게 함
  ready = true;
}

async function loadStyle() {
  const base = new URL(assetUrl("servermap/"), window.location.href);
  const abs = (path: string) => new URL(path, base).href;
  const res = await fetch(abs("style.json"));
  if (!res.ok) throw new Error(`style.json 을 못 가져옴 (HTTP ${res.status})`);
  const style = (await res.json()) as any;
  let tilesUrl = "";
  for (const src of Object.values(style.sources) as any[]) {
    if (typeof src.data === "string") src.data = abs(src.data);
    if (typeof src.url === "string" && src.url.startsWith("pmtiles://")) {
      tilesUrl = abs(src.url.slice("pmtiles://".length));
      src.url = "pmtiles://" + tilesUrl;
    }
  }
  style.layers = style.layers.filter((l: any) => !HIDDEN_LAYERS.has(l.id));
  return { style, tilesUrl };
}

async function checkPmtiles(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-6" } });
    const reader = res.body?.getReader();
    const first = reader ? (await reader.read()).value : undefined;
    reader?.cancel();
    const magic = first ? new TextDecoder().decode(first.slice(0, 7)) : "";
    if (magic !== "PMTiles") {
      return `배경 지도 파일이 PMTiles 가 아님 (HTTP ${res.status}, 시작: "${magic.replace(/[^\x20-\x7e]/g, "?").slice(0, 12)}") → public/servermap/tiles/palace.pmtiles 가 없거나 깨짐`;
    }
    return null;
  } catch (err) {
    return `배경 지도 파일을 못 읽음: ${String(err)}`;
  }
}

const cssVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

function makePinImage() {
  const w = 64, h = 80;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 6, 0, 76);
  g.addColorStop(0, cssVar("--color-green", "#125945"));
  g.addColorStop(1, cssVar("--color-primary", "#BF1F1C"));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(32, 76);
  ctx.bezierCurveTo(14, 56, 8, 44, 8, 30);
  ctx.arc(32, 30, 24, Math.PI, 0, false);
  ctx.bezierCurveTo(56, 44, 50, 56, 32, 76);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(32, 30, 9, 0, Math.PI * 2);
  ctx.fill();
  return ctx.getImageData(0, 0, w, h);
}

// 핀 우선순위: 숫자가 작을수록 먼저 보임
// 1순위 대표 전각(group이 자기 이름) → 하위 항목, 2순위 전각 → 문 → 나머지
// 축소했을 때 겹치는 핀은 우선순위가 낮은 쪽이 자동으로 숨음
const rank = (p: Place) =>
  (p.group === p.ko ? 0 : 1) * 10000 + (p.category === "hall" ? 0 : p.category === "gate" ? 1 : 2) * 1000 + p.serial;

const toFeature = (p: Place) => ({
  type: "Feature" as const,
  properties: { id: p.id, label: p.en, rank: rank(p) },
  geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
});

function ensurePlaceLayers(map: maplibre.Map, onPick: (id: string) => void) {
  if (map.getSource(SRC)) return;
  if (!map.hasImage("gg-pin")) map.addImage("gg-pin", makePinImage(), { pixelRatio: 2 });
  map.addSource(SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  // 이름표(글씨): 확대 16.5 부터. 핀보다 아래 레이어라서 다른 핀과 겹치면 이름표가 양보
  map.addLayer({
    id: "gg-pin-labels", type: "symbol", source: SRC, minzoom: LABEL_MIN_ZOOM,
    layout: {
      "text-field": ["get", "label"], "text-font": ["Regular"], "text-size": 11,
      "text-anchor": "top", "text-offset": [0, 0.7], "text-max-width": 8,
      "symbol-sort-key": ["get", "rank"],
    },
    paint: {
      "text-color": cssVar("--color-ink", "#262626"),
      "text-halo-color": cssVar("--color-bg", "#FBFBFB"),
      "text-halo-width": 1.5,
    },
  } as any);
  // 핀: 맨 위 레이어. 겹치는 핀은 우선순위 낮은 것부터 숨음
  // 축소하면 몇 개만, 확대하면 전부(자기 이름표와는 겹치지 않도록 이름표를 아래로 띄워 둠)
  map.addLayer({
    id: "gg-pins", type: "symbol", source: SRC,
    layout: {
      "icon-image": "gg-pin", "icon-anchor": "bottom", "icon-padding": 2,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 15, 0.5, 17, 0.75, 19, 0.95],
      "symbol-sort-key": ["get", "rank"],
    },
  } as any);
  map.on("click", "gg-pins", (e: any) => {
    const id = e.features?.[0]?.properties?.id;
    if (id) onPick(String(id));
  });
  map.on("mouseenter", "gg-pins", () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "gg-pins", () => { map.getCanvas().style.cursor = ""; });
}

// route: 길 안내 선은 route.mjs 연결 후에 그림(지금은 지도만 보임)
export function MapView({ route = false }: { route?: boolean }) {
  void route;
  const { goToPlace } = useApp();
  const pickRef = useRef(goToPlace);
  pickRef.current = goToPlace;

  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibre.Map | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [notes, setNotes] = useState<string[]>([]); // 개발 중에만 화면에 보이는 오류 메모
  const addNote = (msg: string) => setNotes((n) => (n.includes(msg) || n.length >= 3 ? n : [...n, msg]));
  const { places } = usePlaces();

  useEffect(() => {
    let cancelled = false;
    let map: maplibre.Map | null = null;
    (async () => {
      try {
        initMapLibre();
        const { style, tilesUrl } = await loadStyle();
        if (cancelled || !box.current) return;
        if (import.meta.env.DEV && tilesUrl) checkPmtiles(tilesUrl).then((m) => m && !cancelled && addNote(m));
        map = new ml.Map({
          container: box.current,
          style,
          center: style.center,
          zoom: style.zoom ?? 16,
          maxZoom: 20,
          attributionControl: { compact: true },
          // 지도 글씨는 서버 글꼴 없이 기기의 한글 글꼴
          localIdeographFontFamily: "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
        });
        const patchGlyphs = () => {
          try { (map as any).style.glyphManager._doesCharSupportLocalGlyph = () => true; } catch { /* 무시 */ }
        };
        patchGlyphs();
        map.on("style.load", patchGlyphs);
        mapRef.current = map;
        map.on("load", () => setStatus("ready"));
        map.on("error", (e: any) => {
          const msg = e?.error?.message ?? String(e);
          console.warn("[map]", msg);
          if (import.meta.env.DEV) addNote(msg.slice(0, 140));
        });
      } catch (err: any) {
        console.error("[map]", err);
        addNote(String(err?.message ?? err));
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // 핀 레이어 만들기 + 장소 데이터 넣기
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    ensurePlaceLayers(map, (id) => pickRef.current(id));
    const shown = places.filter(isFeatured);
    (map.getSource(SRC) as maplibre.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: shown.map(toFeature),
    } as any);
  }, [status, places]);

  return <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "var(--color-map)" }}>
    <div ref={box} style={{ position: "absolute", inset: 0 }} />
    {status !== "ready" && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 12, color: "var(--color-ink)", pointerEvents: "none" }}>
      {status === "error" ? "Map unavailable" : "Loading map…"}
    </div>}
    {import.meta.env.DEV && notes.length > 0 && <div style={{ position: "absolute", top: 72, left: 6, right: 96, zIndex: 2, background: "rgba(255,255,255,.93)", color: "#b00020", fontSize: 10, lineHeight: 1.35, padding: "4px 6px", borderRadius: 6, pointerEvents: "none", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
      {notes.join("\n")}
    </div>}
  </div>;
}
