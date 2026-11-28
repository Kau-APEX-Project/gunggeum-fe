import { useEffect, useState } from "react";

// 오디오 가이드 가사(자막). 문장마다 음성 파일의 시작·끝 시간(초)이 들어 있는 JSON 을 읽어 옵니다.
// JSON 파일 이름 규칙: "<serial 3자리>_<전각 한글명>_<언어>.json"  예) 227_건순각_en.json
// 위치는 음성 파일과 같은 audio/ 폴더입니다. 파일 형식:
//   { "serial_number": 227, "duration": 82.84, "sentences": [ { "i": 1, "text": "...", "start": 0.0, "end": 1.625 }, ... ] }

export type LyricLine = { i: number; text: string; start: number; end: number };

/** 타임스탬프 JSON 에서 쓸 수 있는 문장만 골라 시간 순서로 돌려줌. 형식이 틀렸거나 하나도 없으면 null */
export function parseLyrics(raw: unknown): LyricLine[] | null {
  const list = (raw as { sentences?: unknown } | null)?.sentences;
  if (!Array.isArray(list)) return null;
  const lines: LyricLine[] = [];
  list.forEach((item, index) => {
    const s = (item ?? {}) as Record<string, unknown>;
    const text = typeof s.text === "string" ? s.text.trim() : "";
    const { start, end } = s;
    if (!text || typeof start !== "number" || typeof end !== "number") return;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) return;
    lines.push({ i: typeof s.i === "number" ? s.i : index + 1, text, start, end });
  });
  lines.sort((a, b) => a.start - b.start);
  return lines.length > 0 ? lines : null;
}

// 재생 위치를 알려 주는 timeupdate 는 1초에 4번쯤만 오므로, 조금 앞서 계산해서 글자가 소리보다 늦지 않게 함
const SYNC_LEAD = 0.15;

/** 지금 재생 위치(초)에 해당하는 문장 번호. 첫 문장 시작 전이면 -1 */
export function lineAt(lines: LyricLine[], seconds: number): number {
  const t = seconds + SYNC_LEAD;
  let lo = 0, hi = lines.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start <= t) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return found; // 문장 사이의 짧은 쉼에서는 앞 문장을 그대로 강조
}

const cache = new Map<string, LyricLine[]>();      // 성공한 것만 저장 (실패는 다음에 다시 시도)
const loading = new Map<string, Promise<LyricLine[] | null>>();

/** 가사 파일 하나를 불러옴. 파일이 없거나 형식이 틀리면 null (그 건물은 가사 없이 음성만 재생) */
export function loadLyrics(src: string): Promise<LyricLine[] | null> {
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit);
  let job = loading.get(src);
  if (!job) {
    job = fetch(src)
      // 파일이 없을 때 서버가 index.html 을 200 으로 돌려주는 경우에도 JSON 파싱이 실패해서 null 이 됨
      .then(async (res) => (res.ok ? parseLyrics(await res.json()) : null))
      .catch(() => null)
      .then((lines) => { if (lines) cache.set(src, lines); loading.delete(src); return lines; });
    loading.set(src, job);
  }
  return job;
}

/** 건물 하나의 가사. 아직 불러오는 중이거나 없으면 null */
export function useLyrics(src: string | undefined): LyricLine[] | null {
  const [loaded, setLoaded] = useState<{ src: string; lines: LyricLine[] | null } | null>(null);
  useEffect(() => {
    if (!src) return;
    let alive = true;
    loadLyrics(src).then((lines) => { if (alive) setLoaded({ src, lines }); });
    return () => { alive = false; };
  }, [src]);
  return src && loaded?.src === src ? loaded.lines : null;
}
