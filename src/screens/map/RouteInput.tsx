import { useEffect, useRef, useState } from "react";
import "@/styles/connect.css";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { ApiError, type ApiErrorKind } from "@/lib/apiTypes";
import { getLanguage } from "@/lib/language";
import { setPlan } from "@/lib/navStore";
import { buildCoursePlan } from "@/lib/routeStore";
import { ensureVisitTracking, getVisit } from "@/lib/visitStore";

const MINUTES: Record<string, number> = { "30 min": 30, "60 min": 60, "90+ min": 90 };

// 입력한 시간·관심사를 서버가 읽을 한 문장으로 만듦 (서버가 문장에서 시간(분)과 원하는 것을 읽음)
function buildRequest(time: string, interests: string[]): string {
  const minutes = MINUTES[time] ?? 60;
  const topics = interests.map((t) => t.toLowerCase());
  const likes = topics.length === 0 ? "" : ` I'm interested in ${topics.length === 1 ? topics[0] : `${topics.slice(0, -1).join(", ")} and ${topics[topics.length - 1]}`}.`;
  const lang = getLanguage() === "th" ? " Please answer in Thai." : ""; // 서버는 요청 문장의 언어로 답함
  return `I have ${minutes} minutes.${likes}${lang}`;
}

function errorText(kind?: ApiErrorKind): string {
  switch (kind) {
    case "rate_limit": return "Too many requests right now. Please try again in a moment.";
    case "timeout": return "This is taking longer than expected. Please try again.";
    default: return "We couldn't create a route. Please try again.";
  }
}

export function RouteInput() {
  const { routeTime, setRouteTime, routeInterests, setRouteInterests, go } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; void ensureVisitTracking(); return () => { alive.current = false; }; }, []);

  // 서버가 경로를 만드는 데 10~20초가 걸려서 기다리는 화면을 먼저 보여 줌
  async function create() {
    setError("");
    setLoading(true);
    try {
      const v = getVisit().position;
      const plan = await buildCoursePlan(buildRequest(routeTime, routeInterests), v ? [v.lng, v.lat] : null);
      if (!alive.current) return;
      setPlan(plan);
      go("T-15");
    } catch (e) {
      console.warn("[route] 코스를 만들지 못했습니다", e);
      if (!alive.current) return;
      setError(errorText(e instanceof ApiError ? e.kind : "network"));
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="screen-pad route-loading" role="status"><span className="ask-dots"><i /><i /><i /></span><span>Planning your route…</span></div>;
  }
  return <div className="screen-pad"><ScreenHeader title="Recommend a route" /><p className="intro">We'll create a route that fits your visit.</p>
    <section className="form-section"><h2>How much time do you have?</h2><div className="chips">{["30 min", "60 min", "90+ min"].map((t) => <button key={t} className={routeTime === t ? "selected" : ""} onClick={() => setRouteTime(t)}>{t}</button>)}</div></section>
    <section className="form-section"><h2>What interests you?</h2><p>Choose all that apply</p><div className="chips wrap">{["Architecture", "Royal life", "Gardens", "History"].map((t) => <button key={t} className={routeInterests.includes(t) ? "selected" : ""} onClick={() => setRouteInterests(routeInterests.includes(t) ? routeInterests.filter((x) => x !== t) : [...routeInterests, t])}>{t}</button>)}</div></section>
    <div className="route-sketch"><Icon name="route" size={48} /><span>Your route will start from your current location.</span></div>
    {error && <p className="form-notice" role="alert">{error}</p>}
    <div className="bottom-buttons"><Button onClick={create}>{error ? "Try again" : "Create route"}</Button></div>
  </div>;
}
