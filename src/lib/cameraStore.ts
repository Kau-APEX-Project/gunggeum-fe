import { useSyncExternalStore } from "react";
import {
  createCameraFeature,
  type CameraCandidate,
  type CameraFeature,
  type CameraOpenInfo,
  type CameraStateInfo,
} from "@/camera/connect-example.mjs";

// 카메라 인식 기능을 앱 전체에서 한 번만 만들어 두고 화면에는 상태만 알려줌
// 새로 만들 때마다 모델을 다시 내려받고 준비하지 않게 하기 위함 

export type CameraPhase = "idle" | "preparing" | "ready" | "recognizing" | "error";

export type CameraSnapshot = {
  phase: CameraPhase;          // 인식기 준비 상태
  busy: boolean;               // 사진을 보냈고 결과를 기다리는 중
  candidates: CameraCandidate[]; // 후보 (점수 높은 순, 최대 3개), 빈 배열 = 아직 결과 없음
  photoUrl: string | null;     // 사용자가 고른 사진 (화면 배경용)
  errorCode: string | null;
};

let snap: CameraSnapshot = { phase: "idle", busy: false, candidates: [], photoUrl: null, errorCode: null };
const listeners = new Set<() => void>();
function set(patch: Partial<CameraSnapshot>) {
  snap = { ...snap, ...patch };
  listeners.forEach((l) => l());
}
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};
export const useCameraState = () => useSyncExternalStore(subscribe, () => snap);

// 인식 모듈이 알려 주는 것 받기
let openBuilding: ((info: CameraOpenInfo) => void) | null = null;
// 후보를 눌렀을 때 건물 상세로 이동하는 함수를 화면이 등록
export const setOpenBuildingHandler = (fn: ((info: CameraOpenInfo) => void) | null) => { openBuilding = fn; };

function onState(s: CameraStateInfo) {
  switch (s.status) {
    case "downloading":
    case "initializing":
      set({ phase: "preparing" });
      break;
    case "fallback": // WebGPU > WASM 전환, 인식 중에 전환되면 화면 문구를 바꾸지 않음
      if (snap.phase !== "recognizing") set({ phase: "preparing" });
      break;
    case "ready":
      set({ phase: "ready" });
      break;
    case "recognizing":
      set({ phase: "recognizing" });
      break;
    case "error":
      set({ phase: "error", busy: false, errorCode: snap.errorCode ?? (typeof s.code === "string" ? s.code : "ERROR") });
      break;
    case "disposed":
      set({ phase: "idle" });
      break;
  }
}

function onCandidates(candidates: CameraCandidate[]) {
  if (candidates.length > 0) {
    set({ candidates, busy: false, errorCode: null });
    // 개발 중에만: 점수 기준(92%, 80%)을 정할 때 참고하도록 콘솔에 점수를 남김
    if (import.meta.env.DEV) {
      console.info("[camera]", candidates.map((c) => `${c.name_ko} ${(c.score * 100).toFixed(1)}%`).join(" | "));
    }
  } else {
    set({ candidates });
  }
}

function onError(code: string, message: string) {
  console.warn("[camera]", code, message);
  set({ busy: false, errorCode: code });
}

function onOpenBuilding(info: CameraOpenInfo) {
  openBuilding?.(info);
}

// 한 번만 만들기
let featurePromise: Promise<CameraFeature> | null = null;
function getFeature() {
  if (!featurePromise) {
    featurePromise = createCameraFeature({ onState, onCandidates, onOpenBuilding, onError }).catch((err) => {
      console.error("[camera] 만들기 실패", err);
      featurePromise = null; // 다음에 다시 시도할 수 있게 비워 둠
      set({ phase: "error", busy: false, errorCode: "SETUP_FAILED" });
      throw err;
    });
  }
  return featurePromise;
}

function revokePhoto() {
  if (snap.photoUrl) URL.revokeObjectURL(snap.photoUrl);
}

// 화면에서 쓰는 함수 목록
export async function enterCamera() {
  set({ errorCode: null });
  try {
    const f = await getFeature();
    await f.enter();
  } catch {
    /* 오류는 상태(errorCode)에 이미 반영 */
  }
}

/* 카메라 화면을 완전히 나갈 때: 결과와 사진을 비우고 진행 중인 인식을 취소 */
export function leaveCamera() {
  revokePhoto();
  set({ candidates: [], photoUrl: null, busy: false, errorCode: null });
  featurePromise?.then((f) => f.leave()).catch(() => {});
}

/* 사진 한 장을 인식. 결과는 candidates 로 들어옴 */
export async function submitPhoto(file: File) {
  revokePhoto();
  set({ photoUrl: URL.createObjectURL(file), busy: true, errorCode: null, candidates: [] });
  try {
    const f = await getFeature();
    await f.selectPhoto(file);
  } catch {
    set({ busy: false });
  }
}

/** 후보를 골랐을 때 받은 후보 객체를 그대로 넘겨야 함(복사본은 무시됨) */
export async function chooseCandidate(candidate: CameraCandidate) {
  try {
    const f = await getFeature();
    f.choose(candidate);
  } catch {
    /* 오류는 상태에 반영됨 */
  }
}

/** 다시 찍기: 이전 사진과 결과를 비웁니다. */
export function resetScan() {
  revokePhoto();
  set({ candidates: [], photoUrl: null, busy: false, errorCode: null });
}

// 오류 문구
const SETUP_ERRORS = new Set(["SETUP_FAILED", "DOWNLOAD_FAILED", "PREPARE_FAILED", "MODEL_MISMATCH", "INVALID_MAPPING"]);
/** 인식기 준비 실패인지 (다시 시도 버튼을 보여 줄 오류) */
export const isSetupError = (code: string) => SETUP_ERRORS.has(code);

export function cameraErrorText(code: string): string {
  switch (code) {
    case "INVALID_IMAGE":
      return "Please choose a photo under 20 MB.";
    case "IMAGE_DECODE_FAILED":
      return "We couldn't read this photo. Try another one.";
    case "UNMAPPED_CARD":
      return "We couldn't match this building to a guide.";
    case "INFERENCE_FAILED":
    case "INVALID_OUTPUT":
      return "Recognition failed. Please try again.";
    default:
      return isSetupError(code)
        ? "The recognizer couldn't be set up. Check your connection and try again."
        : "Something went wrong. Please try again.";
  }
}
