import { useSyncExternalStore } from "react";
import { USE_MOCK, fetchSession, wsBase } from "@/lib/api";
import { ApiError } from "@/lib/apiTypes";
import type { Lang } from "@/lib/language";
import { listenUrl, normalizeCode, parseServerMessage, pingMessage, resumeMessage, type LiveLine, type SessionInfo } from "@/lib/liveProtocol";

//   관광객 실시간 자막(T-31)의 연결과 상태를 맡는 곳
//   joinLive > 세션 확인(GET /api/sessions/{code}) > WebSocket(listen) 연결 > 자막·gap·mic·종료 수신
//   끊기면 1, 2, 4, 8초… (최대 15초) 간격으로 다시 연결하고 연결되면 마지막 순번으로 resume 을 보냄

export type LiveStatus = "idle" | "checking" | "connecting" | "live" | "reconnecting" | "ended" | "failed";
export type LiveItem = ({ kind: "line" } & LiveLine) | { kind: "gap"; fromSeq: number; toSeq: number };
export type LiveSnapshot = {
  mode: "off" | "demo" | "real";       // demo = 시안(가짜 자막), real = 서버 연결
  code: string | null;
  lang: Lang;
  info: SessionInfo | null;
  status: LiveStatus;
  micOn: boolean;
  items: LiveItem[];
  lastSeq: number;
  failReason: "not_found" | "network" | "rate_limit" | null;
};

const INITIAL: LiveSnapshot = { mode: "off", code: null, lang: "en", info: null, status: "idle", micOn: false, items: [], lastSeq: 0, failReason: null };
let snap: LiveSnapshot = INITIAL;
const listeners = new Set<() => void>();
function set(patch: Partial<LiveSnapshot>) { snap = { ...snap, ...patch }; listeners.forEach((l) => l()); }
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useLive = () => useSyncExternalStore(subscribe, () => snap);
export const getLive = () => snap;

const MAX_ITEMS = 500;      // 화면에 쌓아 두는 자막 줄 수 (넘으면 오래된 것부터 버림)
const MAX_ATTEMPTS = 8;     // 연속으로 못 붙으면 포기하고 "Try again" 표시
const PING_MS = 30000;
const backoff = (n: number) => Math.min(1000 * 2 ** (n - 1), 15000);

let ws: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let attempts = 0;
let connectedOnce = false;
let closedByUs = false;
let onlineHandler: (() => void) | null = null;

function clearTimers() {
  if (pingTimer) clearInterval(pingTimer);
  if (retryTimer) clearTimeout(retryTimer);
  pingTimer = retryTimer = null;
}

function closeSocket() {
  closedByUs = true;
  clearTimers();
  if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; try { ws.close(); } catch { /* 이미 닫힘 */ } }
  ws = null;
}

function handleMessage(data: unknown) {
  const ev = parseServerMessage(data);
  if (!ev) return;
  if (ev.kind === "line") {
    if (ev.line.seq <= snap.lastSeq) return; // 이미 받은 순번은 무시 (재전송 대비)
    const item: LiveItem = { ...ev.line, kind: "line" };
    set({ items: [...snap.items, item].slice(-MAX_ITEMS), lastSeq: ev.line.seq });
  } else if (ev.kind === "gap") {
    const item: LiveItem = { kind: "gap", fromSeq: ev.fromSeq, toSeq: ev.toSeq };
    set({ items: [...snap.items, item].slice(-MAX_ITEMS), lastSeq: Math.max(snap.lastSeq, ev.toSeq) });
  } else if (ev.kind === "mic") {
    set({ micOn: ev.on });
  } else if (ev.kind === "ended") {
    closeSocket();
    set({ status: "ended" });
  } else if (import.meta.env.DEV) {
    console.info("[live] 처리하지 않은 메시지", ev.type, data);
  }
}

function openSocket() {
  if (!snap.code) return;
  closedByUs = false;
  set({ status: connectedOnce ? "reconnecting" : "connecting" });
  const sock = new WebSocket(listenUrl(wsBase, snap.code, snap.lang));
  ws = sock;
  sock.onopen = () => {
    attempts = 0;
    set({ status: "live", failReason: null });
    if (connectedOnce) sock.send(resumeMessage(snap.lastSeq)); // 재연결: 마지막으로 받은 순번을 알림
    connectedOnce = true;
    pingTimer = setInterval(() => { if (sock.readyState === 1) sock.send(pingMessage()); }, PING_MS);
  };
  sock.onmessage = (e) => handleMessage(e.data);
  sock.onerror = () => { /* 곧 onclose 가 따라옴 */ };
  sock.onclose = () => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
    if (closedByUs || ws !== sock || snap.status === "ended") return;
    scheduleRetry();
  };
}

function scheduleRetry() {
  attempts++;
  if (attempts > MAX_ATTEMPTS) { set({ status: "failed", failReason: "network" }); return; }
  set({ status: "reconnecting" });
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    if (snap.mode !== "real" || !snap.code) return;
    try { // 그사이 해설사가 세션을 끝냈는지 확인
      const info = await fetchSession(snap.code);
      if (info?.status === "ended") { set({ status: "ended", info }); return; }
    } catch { /* 서버에 못 닿으면 소켓 재연결로 다시 확인 */ }
    if (snap.mode === "real") openSocket();
  }, backoff(attempts));
}

function retryNow() {
  if (snap.mode !== "real" || !snap.code) return;
  clearTimers();
  attempts = 0;
  closeSocket();
  openSocket();
}

/** 시안(가짜 자막)으로 들어가기: "Join demo session" */
export function startDemo() {
  leaveLive();
  set({ mode: "demo", status: "live" });
}

export type JoinResult = "ok" | "ended" | "not_found" | "rate_limit" | "error";

/** 세션 코드로 입장. 서버가 아직 연결되지 않은(가짜 서버) 상태면 시안으로 들어감 */
export async function joinLive(rawCode: string, lang: Lang): Promise<JoinResult> {
  if (USE_MOCK) { startDemo(); return "ok"; }
  leaveLive();
  const code = normalizeCode(rawCode);
  set({ ...INITIAL, mode: "real", code, lang, status: "checking" });
  let info: SessionInfo | null;
  try {
    info = await fetchSession(code);
  } catch (e) {
    const kind = e instanceof ApiError ? e.kind : "network";
    const failReason = kind === "not_found" ? "not_found" : kind === "rate_limit" ? "rate_limit" : "network";
    set({ status: "failed", failReason });
    return failReason === "network" ? "error" : failReason;
  }
  if (snap.code !== code) return "error"; // 기다리는 사이 다른 곳으로 바뀜
  set({ info, micOn: info?.micOn ?? false });
  if (info?.status === "ended") { set({ status: "ended" }); return "ended"; }
  if (!onlineHandler) { onlineHandler = () => { if (snap.status === "reconnecting" || snap.status === "failed") retryNow(); }; window.addEventListener("online", onlineHandler); }
  attempts = 0;
  connectedOnce = false;
  openSocket();
  return "ok";
}

/** 실패 화면의 "Try again" */
export function retryLive() {
  if (snap.mode === "real" && snap.code) void joinLive(snap.code, snap.lang);
}

/** 자막 화면을 나갈 때: 연결을 닫고 모든 상태를 지움 */
export function leaveLive() {
  closeSocket();
  if (onlineHandler) { window.removeEventListener("online", onlineHandler); onlineHandler = null; }
  attempts = 0;
  connectedOnce = false;
  set({ ...INITIAL });
}
