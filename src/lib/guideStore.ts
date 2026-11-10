import { useSyncExternalStore } from "react";
import { loadPlaces } from "@/data/places";
import { wsBase } from "@/lib/api";
import { FRAME_SAMPLES, guideUrl, locationMessage, micMessage, parseGuideMessage } from "@/lib/guideProtocol";
import { pingMessage } from "@/lib/liveProtocol";
import { PcmPipeline } from "@/lib/pcm";
import { onVisitEvent, representative, startVisitTracking } from "@/lib/visitStore";

// 해설사 콘솔(G-03)의 연결과 마이크를 맡는 곳
//   startGuide: 가이드 토큰으로 WebSocket(guide) 연결 > 끊기면 자동 재연결(재연결되면 마이크 상태·위치를 다시 알림)
//   setGuideMic: 마이크 켜기 > 소리를 PCM 16kHz mono 16bit 조각으로 바꿔 연속 전송 / 끄기 > mic(false) 전송
//   위치: 방문 판정 모듈이 "새 장소에 들어옴(enter)"을 알리면 그 장소의 id 를 location 으로 전송 (좌표는 보내지 않음)

export type GuideStatus = "idle" | "connecting" | "live" | "reconnecting" | "failed";
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
};

const INITIAL: GuideSnapshot = { status: "idle", code: null, micState: "off", participants: 0, languages: {}, transcript: "", sttError: null, location: null };
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
    // 서버는 해설사 연결이 끊기면 마이크를 끈 것으로 보므로 마이크가 켜져 있던 상태로 다시 붙으면 켜졌다고 다시 알려 준다
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
    else if (import.meta.env.DEV) console.info("[guide] 처리하지 않은 메시지", ev.type, e.data);
  };
  sock.onerror = () => { /* 곧 onclose 가 따라옴 */ };
  sock.onclose = () => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
    if (closedByUs || ws !== sock) return;
    attempts++;
    if (attempts > MAX_ATTEMPTS) { set({ status: "failed" }); return; }
    set({ status: "reconnecting" });
    retryTimer = setTimeout(() => { retryTimer = null; openSocket(); }, backoff(attempts));
  };
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
function maybeSendLocation(poiId: string) {
  loadPlaces().then((places) => {
    const id = representative(places, poiId)?.id ?? poiId; // 같은 마당(근정전·조정·내부)은 대표 전각 하나로
    if (id === snap.location) return;
    set({ location: id });
    send(locationMessage(id));
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

export async function setGuideMic(on: boolean): Promise<void> {
  if (!on) {
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
  set({ micState: "starting", sttError: null });
  // 브라우저는 사용자가 누른 직후에만 소리 장치를 켜 주므로(특히 아이폰) 기다리기 전에 먼저 만들어 둔다
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  try {
    if (!Ctx) throw new Error("AudioContext 를 쓸 수 없는 브라우저");
    ctx = new Ctx();
    void ctx.resume();
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const url = URL.createObjectURL(new Blob([WORKLET_CODE], { type: "application/javascript" }));
    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    pipeline = new PcmPipeline(ctx.sampleRate, FRAME_SAMPLES);
    source = ctx.createMediaStreamSource(stream);
    node = new AudioWorkletNode(ctx, "pcm-tap");
    node.port.onmessage = (e: MessageEvent) => handleBlock(e.data as Float32Array);
    mute = ctx.createGain();
    mute.gain.value = 0; // 소리를 스피커로 내보내지 않음 (처리만 하려고 연결)
    source.connect(node);
    node.connect(mute);
    mute.connect(ctx.destination);
    set({ micState: "on" });
    send(micMessage(true));
    void startVisitTracking(); // 위치 허용을 받아 두면 위치별 사전으로 전각 이름 인식이 좋아짐 (거부해도 마이크는 동작)
    try { wakeLock = (await (navigator as unknown as { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock?.request("screen")) ?? null; } catch { /* 화면 켜짐 유지는 있으면 좋은 기능 */ }
  } catch (e) {
    const name = (e as { name?: string })?.name ?? "";
    stopCapture();
    set({ micState: name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error" });
    console.warn("[guide] 마이크를 켜지 못했습니다", e);
  }
}

// ---------- 시작·종료 ----------
/** G-03 에 들어오면 호출. 같은 세션이 이미 연결 중이면 그대로 둔다(Show QR again 으로 G-02 에 다녀와도 연결 유지) */
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

/** 세션 종료·콘솔 이탈 때: 마이크를 끄고 연결을 닫고 상태를 지운다 */
export function leaveGuide() {
  stopCapture();
  closeSocket();
  unsubVisit?.();
  unsubVisit = null;
  token = "";
  attempts = 0;
  set({ ...INITIAL });
}
