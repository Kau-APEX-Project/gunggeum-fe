import { useEffect, useState } from "react";
import { fetchCard } from "@/lib/api";
import type { CardResponse } from "@/lib/apiTypes";

// 고유명사 카드(PNC)를 서버에서 받아 오는 훅. 한 번 받은 카드는 앱이 켜져 있는 동안 기억한다
const cache = new Map<string, CardResponse>();

type CardState = { status: "idle" | "loading" | "ready" | "error"; card?: CardResponse };

export function useCard(id: string | null) {
  const [state, setState] = useState<CardState>({ status: "idle" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!id) { setState({ status: "idle" }); return; }
    const cached = cache.get(id);
    if (cached) { setState({ status: "ready", card: cached }); return; }
    let off = false;
    setState({ status: "loading" });
    fetchCard(id)
      .then((card) => { cache.set(id, card); if (!off) setState({ status: "ready", card }); })
      .catch(() => { if (!off) setState({ status: "error" }); });
    return () => { off = true; };
  }, [id, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
