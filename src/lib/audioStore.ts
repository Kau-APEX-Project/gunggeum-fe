import { useSyncExternalStore } from "react";
import { sampleTrack } from "@/data/audio";
import { assetUrl } from "@/lib/assets";
import { getLanguage, type Lang } from "@/lib/language";

// 오디오 가이드가 지금 재생할 곡
// 파일 이름 규칙: "<serial 3자리>_<전각 한글명>_<언어>.<확장자>"
//   음성   160_근정전_en.mp4
//   가사   160_근정전_en.json   (문장별 시작·끝 시간. 형식은 src/lib/lyrics.ts 맨 위 참고)
// 위치: <VITE_ASSET_BASE>/audio/ (비워 두면 이 프로젝트의 public/audio/)
export const AUDIO_DIR = "audio";
export const AUDIO_EXT = "mp4"; // 음성 파일 확장자가 바뀌면 여기 한 줄만 고침
// 음성·가사 파일이 준비된 언어. 태국어 파일(_th)이 생기면 "th" 를 추가하면 됨.
// 목록에 없는 언어를 쓰는 사람은 영어 파일을 듣게 됨.
export const AUDIO_LANGS: Lang[] = ["en"];

export type AudioTrack = { src: string; title: string; lyricsSrc?: string; missing?: boolean };
type PlaceLike = { serial: number; ko: string; en: string };

const fileLang = (lang: Lang): Lang => (AUDIO_LANGS.includes(lang) ? lang : "en");
// 맥에서 만든 파일의 자모 분리 문제를 막으려고 이름을 NFC 로 맞춤
const baseName = (p: Pick<PlaceLike, "serial" | "ko">, lang: Lang) => `${p.serial}_${p.ko}_${fileLang(lang)}`.normalize("NFC");

export const audioFileName = (p: Pick<PlaceLike, "serial" | "ko">, lang: Lang = getLanguage()) => `${baseName(p, lang)}.${AUDIO_EXT}`;
export const lyricsFileName = (p: Pick<PlaceLike, "serial" | "ko">, lang: Lang = getLanguage()) => `${baseName(p, lang)}.json`;

export const audioUrl = (p: Pick<PlaceLike, "serial" | "ko">, lang?: Lang) => assetUrl(`${AUDIO_DIR}/${encodeURIComponent(audioFileName(p, lang))}`);
export const lyricsUrl = (p: Pick<PlaceLike, "serial" | "ko">, lang?: Lang) => assetUrl(`${AUDIO_DIR}/${encodeURIComponent(lyricsFileName(p, lang))}`);

let track: AudioTrack = { src: sampleTrack.src, title: sampleTrack.title };
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

/** 재생할 건물을 정함. null 이면 시안 샘플 곡(가사 없음) */
export function setGuideTrack(place: PlaceLike | null) {
  track = place ? { src: audioUrl(place), title: place.en, lyricsSrc: lyricsUrl(place) } : { src: sampleTrack.src, title: sampleTrack.title };
  listeners.forEach((l) => l());
}

export const useAudioTrack = () => useSyncExternalStore(subscribe, () => track);
