import { useSyncExternalStore } from "react";
import { sampleTrack } from "@/data/audio";
import { assetUrl } from "@/lib/assets";

// 오디오 가이드가 지금 재생할 곡
// 위치: <VITE_ASSET_BASE>/audio/ (비워 두면 이 프로젝트의 public/audio/)
export const AUDIO_DIR = "audio";
export const AUDIO_EXT = "mp4";

export type AudioTrack = { src: string; title: string; missing?: boolean };
type PlaceLike = { serial: number; ko: string; en: string };

/** 건물 한 곳의 음성 파일 이름 (맥에서 만든 파일의 자모 분리 문제를 막으려고 NFC 로 맞춤) */
export const audioFileName = (p: Pick<PlaceLike, "serial" | "ko">) => `${p.serial}_${p.ko}.${AUDIO_EXT}`.normalize("NFC");

export const audioUrl = (p: Pick<PlaceLike, "serial" | "ko">) => assetUrl(`${AUDIO_DIR}/${encodeURIComponent(audioFileName(p))}`);

let track: AudioTrack = { src: sampleTrack.src, title: sampleTrack.title };
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

/** 재생할 건물을 정함. null 이면 시안 샘플 곡 */
export function setGuideTrack(place: PlaceLike | null) {
  track = place ? { src: audioUrl(place), title: place.en } : { src: sampleTrack.src, title: sampleTrack.title };
  listeners.forEach((l) => l());
}

export const useAudioTrack = () => useSyncExternalStore(subscribe, () => track);
