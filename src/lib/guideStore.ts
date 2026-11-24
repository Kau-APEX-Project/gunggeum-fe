import { useSyncExternalStore } from "react";
import { loadPlaces } from "@/data/places";
import { wsBase } from "@/lib/api";
import { CLOSE_UNAUTHORIZED, FRAME_SAMPLES, NO_RETRY_CLOSE_CODES, guideUrl, locationMessage, micMessage, parseGuideMessage } from "@/lib/guideProtocol";
import { pingMessage } from "@/lib/liveProtocol";
import { PcmPipeline } from "@/lib/pcm";
import { onVisitEvent, representative, startVisitTracking } from "@/lib/visitStore";

// 해설사 콘솔(G-03)의 연결과 마이크를 맡는 파일
//   startGuide: 가이드 토큰으로 WebSocket(guide) 연결 > 끊기면 자동 재연결(재연결되면 마이크 상태·위치를 다시 알림)
//   setGuideMic: 마이크 켜기 > 소리를 PCM 16kHz mono 16bit 조각으로 바꿔 연속 전송 / 끄기 > mic(false) 전송
//   위치: 방문 판정 모듈이 "새 장소에 들어옴(enter)"을 알리면 그 장소의 id 를 location 으로 전송 (좌표는 보내지 않음)
//   수동 위치: setGuideLocation(id) 으로 직접 고르면 auto 로 되돌리기 전까지 GPS 자동 전송은 무시함
//   종료: session_ended 메시지나 close code 4401/4404/4410 을 받으면 재연결하지 않음

export type GuideStatus = "idle" | "connecting" | "live" | "reconnecting" | "failed" | "ended" | "unauthorized";
export type LocationMode = "auto" | "manual";
export type MicState = "off" | "starting" | "on" | "denied" | "insecure" | "error";
export type GuideSnapshot = {
  status: GuideStatus;
  code: string | null;
  micState: MicState;
  participants: number;
  languages: Record<string, number>;
  transcript: string;          // 서버가 보내 준 최근 인식 문장 (오인식 확인용)
  sttError: string | null;
  location: string | null;     // 마지막으로 보낸 위치(장소 id)
  locationMode: LocationMode;  // auto = GPS 판정을 따름, manual = 해설사가 직접 고른 값을 유지
};

const INITIAL: GuideSnapshot = { status: "idle", code: null, micState: "off", participants: 0, languages: {}, transcript: "", sttError: null, location: null, locationMode: "auto" };
let snap: GuideSnapshot = INITIAL;
const listeners = new Set<() => void>();
function set(patch: Partial<GuideSnapshot>) { snap = { ...snap, ...patch }; listeners.forEach((l) => l()); }
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useGuide = () => useSyncExternalStore(subscribe, () => snap);
export const getGuide = () => snap;

const MAX_ATTEMPTS = 8;
const PING_MS = 30000;
const MAX_BUFFERED = 1_000_000; // 서버로 못 나간 소리가 이만큼 쌓이면 새 조각은 버림 (지연 방지)
const backoff = (n: number) => Math.min(1000 * 2 ** (n - 1), 15000);

// ---------- WebSocket ----------
let ws: WebSocket | null = null;
let token = "";
let attempts = 0;
let closedByUs = false;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let unsubVisit: (() => void) | null = null;

function send(message: string | ArrayBuffer) {
  if (ws && ws.readyState === 1) ws.send(message);
}

function openSocket() {
  if (!snap.code) return;
  closedByUs = false;
  set({ status: attempts === 0 ? "connecting" : "reconnecting" });
  const sock = new WebSocket(guideUrl(wsBase, snap.code, token));
  ws = sock;
  sock.onopen = () => {
    attempts = 0;
    set({ status: "live" });
    // 서버는 해설사 연결이 끊기면 마이크를 끈 것으로 보므로, 마이크가 켜져 있던 상태로 다시 붙으면 켜졌다고 다시 알림
    if (snap.micState === "on") send(micMessage(true));
    if (snap.location) send(locationMessage(snap.location));
    pingTimer = setInterval(() => send(pingMessage()), PING_MS);
  };
  sock.onmessage = (e) => {
    const ev = parseGuideMessage(e.data);
    if (!ev) return;
    if (ev.kind === "presence") set({ participants: ev.participants, languages: ev.languages });
    else if (ev.kind === "transcript") set({ transcript: ev.text, sttError: null });
    else if (ev.kind === "error") set({ sttError: ev.message });
    else if (ev.kind === "ended") endedByServer();
    else if (import.meta.env.DEV) console.info("[guide] 처리하지 않은 메시지", ev.type, e.data);
  };
  sock.onerror = () => { /* 곧 onclose 가 따라옴 */ };
  sock.onclose = (e) => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
    if (closedByUs || ws !== sock) return;
    if (NO_RETRY_CLOSE_CODES.includes(e.code)) { // 재연결해도 계속 거절되는 코드
      if (e.code === CLOSE_UNAUTHORIZED) { stopCapture(); closeSocket(); set({ status: "unauthorized", micState: "off" }); }
      else endedByServer();
      return;
    }
    attempts++;
    if (attempts > MAX_ATTEMPTS) { set({ status: "failed" }); return; }
    set({ status: "reconnecting" });
    retryTimer = setTimeout(() => { retryTimer = null; openSocket(); }, backoff(attempts));
  };
}

// 서버가 세션을 끝냄 (session_ended 또는 4404/4410): 마이크·연결·위치 구독을 정리하고 재연결하지 않음
function endedByServer() {
  micSeq++;
  stopCapture();
  closeSocket();
  unsubVisit?.();
  unsubVisit = null;
  set({ status: "ended", micState: "off" });
}

function closeSocket() {
  closedByUs = true;
  if (pingTimer) clearInterval(pingTimer);
  if (retryTimer) clearTimeout(retryTimer);
  pingTimer = retryTimer = null;
  if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; try { ws.close(); } catch { /* 이미 닫힘 */ } }
  ws = null;
}

// ---------- 위치 전송 ----------
function sendLocation(id: string) {
  set({ location: id });
  send(locationMessage(id));
}

/** 직접 고른 위치를 보냄. null 이면 자동(GPS)으로 되돌림 (다음 enter 이벤트부터 다시 따라감). */
export function setGuideLocation(poiId: string | null) {
  if (poiId === null) { set({ locationMode: "auto" }); return; }
  set({ locationMode: "manual" });
  sendLocation(poiId);
}

function maybeSendLocation(poiId: string) {
  if (snap.locationMode === "manual") return; // 직접 고른 값이 우선
  loadPlaces().then((places) => {
    const id = representative(places, poiId)?.id ?? poiId; // 같은 마당(근정전·조정·내부)은 대표 전각 하나로
    if (id === snap.location || snap.locationMode === "manual") return; // 장소 데이터를 기다리는 사이 수동으로 바뀌었을 수 있음
    sendLocation(id);
  }).catch(() => { /* 장소 데이터를 못 받으면 위치 전송만 건너뜀 */ });
}

// ---------- 마이크 ----------
let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let node: AudioWorkletNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let mute: GainNode | null = null;
let pipeline: PcmPipeline | null = null;
let wakeLock: { release(): Promise<void> } | null = null;

// 마이크 블록(128샘플)을 모아서 메인 쪽으로 보내 주는 오디오 워크렛 (파일 없이 코드 문자열로 만듦)
const WORKLET_CODE = `
class PcmTap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor("pcm-tap", PcmTap);
`;

function handleBlock(block: Float32Array) {
  if (!pipeline || snap.micState !== "on" || !ws || ws.readyState !== 1) return; // 끊겨 있는 동안의 소리는 버림
  for (const frame of pipeline.push(block)) {
    if (ws.bufferedAmount < MAX_BUFFERED) ws.send(frame);
  }
}

function stopCapture() {
  try { node?.port && (node.port.onmessage = null); } catch { /* 무시 */ }
  try { source?.disconnect(); node?.disconnect(); mute?.disconnect(); } catch { /* 무시 */ }
  stream?.getTracks().forEach((t) => t.stop());
  void ctx?.close().catch(() => {});
  void wakeLock?.release().catch(() => {});
  ctx = stream = node = source = mute = pipeline = wakeLock = null;
}

let micSeq = 0; // 마이크 켜기 호출 번호 (켜는 도중 끄거나 다시 누르면 앞선 호출은 중단)
const currentMic = () => snap.micState;

export async function setGuideMic(on: boolean): Promise<void> {
  if (!on) {
    micSeq++;          // 켜는 중이던 호출이 있으면 무효로 만듦
    stopCapture();
    set({ micState: "off" });
    send(micMessage(false));
    return;
  }
  if (snap.micState === "on" || snap.micState === "starting") return;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    set({ micState: typeof window !== "undefined" && window.isSecureContext === false ? "insecure" : "error" });
    return;
  }
  const seq = ++micSeq;
  const stale = () => seq !== micSeq || snap.micState !== "starting";
  set({ micState: "starting", sttError: null });
  // 브라우저는 사용자가 누른 직후에만 소리 장치를 켜 주므로(특히 아이폰), 기다리기 전에 먼저 만들어 둠
  // 이 호출 전용 지역 변수로 들고 있다가, 끝까지 유효할 때만 모듈 변수에 넘김 (도중에 꺼졌을 때 서로 엉키지 않게)
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  let c: AudioContext | null = null;
  let s: MediaStream | null = null;
  const dispose = () => { s?.getTracks().forEach((t) => t.stop()); void c?.close().catch(() => {}); c = s = null; };
  try {
    if (!Ctx) throw new Error("AudioContext 를 쓸 수 없는 브라우저");
    c = new Ctx();
    void c.resume();
    s = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (stale()) { dispose(); return; } // 켜는 도중에 꺼짐 > 상태는 이미 off 이므로 정리만 하고 끝
    const url = URL.createObjectURL(new Blob([WORKLET_CODE], { type: "application/javascript" }));
    try { await c.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    if (stale()) { dispose(); return; }
    ctx = c;
    stream = s;
    pipeline = new PcmPipeline(c.sampleRate, FRAME_SAMPLES);
    source = c.createMediaStreamSource(s);
    node = new AudioWorkletNode(c, "pcm-tap");
    node.port.onmessage = (e: MessageEvent) => handleBlock(e.data as Float32Array);
    mute = c.createGain();
    mute.gain.value = 0; // 소리를 스피커로 내보내지 않음 (처리만 하려고 연결)
    source.connect(node);
    node.connect(mute);
    mute.connect(c.destination);
    set({ micState: "on" });
    send(micMessage(true));
    void startVisitTracking(); // 위치 허용을 받아 두면 위치별 사전으로 전각 이름 인식이 좋아짐 (거부해도 마이크는 동작)
    try {
      const lock = (await (navigator as unknown as { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock?.request("screen")) ?? null;
      if (seq === micSeq && currentMic() === "on") wakeLock = lock; else void lock?.release().catch(() => {});
    } catch { /* 화면 켜짐 유지는 있으면 좋은 기능 */ }
  } catch (e) {
    dispose();
    if (stale()) return; // 이미 꺼졌거나 새로 켜는 중이면 상태를 건드리지 않음 (off 가 error 로 바뀌던 문제)
    const name = (e as { name?: string })?.name ?? "";
    stopCapture();
    set({ micState: name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error" });
    console.warn("[guide] 마이크를 켜지 못했습니다", e);
  }
}

// ---------- 시작·종료 ----------
/** G-03 에 들어오면 호출. 같은 세션이 이미 연결 중이면 그대로 둠 (Show QR again 으로 G-02 에 다녀와도 연결 유지). */
export function startGuide(code: string, guideToken: string) {
  if (snap.code === code && snap.status !== "idle" && snap.status !== "failed") return;
  leaveGuide();
  token = guideToken;
  attempts = 0;
  set({ ...INITIAL, code, status: "connecting" });
  unsubVisit = onVisitEvent((e) => { if (e.type === "enter") maybeSendLocation(e.poiId); });
  openSocket();
}

export function retryGuide() {
  if (!snap.code) return;
  closeSocket();
  attempts = 0;
  openSocket();
}

/** 세션 종료·콘솔 이탈 때: 마이크를 끄고 연결을 닫고 상태를 지움 */
export function leaveGuide() {
  micSeq++;
  stopCapture();
  closeSocket();
  unsubVisit?.();
  unsubVisit = null;
  token = "";
  attempts = 0;
  set({ ...INITIAL });
}
