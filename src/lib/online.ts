import { useSyncExternalStore } from "react";

// 기기가 인터넷에 연결되어 있는지 (S-01 오프라인 표시에 씀)
const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
};
const read = () => (typeof navigator === "undefined" ? true : navigator.onLine);

export const useOnline = () => useSyncExternalStore(subscribe, read, () => true);
