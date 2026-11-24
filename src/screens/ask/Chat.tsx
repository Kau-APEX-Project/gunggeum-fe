import { Fragment, useEffect, useRef, useState } from "react";
import "@/styles/connect.css";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { askErrorText } from "@/lib/apiTypes";
import { retryTurn, useAskTurns, type AskTurn } from "@/lib/askStore";
import { useLanguage } from "@/lib/language";
import { navigateTo, navigateToStop } from "@/lib/navStore";
import { amenitiesNear, amenityStop, legTo, loadRouteData, startPoint, type RouteStop } from "@/lib/routeStore";
import { useVisit } from "@/lib/visitStore";
import { AnswerText } from "@/screens/ask/AnswerText";
import { ChatInput } from "@/screens/ask/ChatInput";

// T-41 답변 · T-42 근거 없음 · T-43 길 묻기 · T-44 편의시설 · S-06 요청 과다 가 같은 채팅 화면을 사용함
// 질문을 이어서 하면 위의 질문·답변이 남은 채로 아래에 쌓인다
export type ChatMode = "answer" | "noEvidence" | "route" | "amenity" | "rateLimited";

const CHAT_SCREENS = ["T-41", "T-42", "T-43", "T-44", "S-06"];

// 아직 질문한 적이 없을 때(시안 목록에서 바로 열었을 때) 보여 주는 예시 문장
const SAMPLE: Record<ChatMode, string> = {
  answer: "[Gyeonghoeru (Royal Banquet Hall)](card:b-173) was built over a pond to create a dramatic setting for royal banquets and receptions. The water also reflects the pavilion and surrounding mountains, expressing harmony between architecture and nature.",
  noEvidence: "The documents I have do not cover this question, so I won't guess.",
  route: "[Gyotaejeon (Queen's Quarters)](card:b-164) was the queen's residence. Behind it you can see the decorated chimneys of Amisan.",
  amenity: "Showing the nearest restrooms on the map.",
  rateLimited: "Too many questions right now. Please try again in a moment.",
};

function Loading() {
  return <div className="ask-loading" role="status"><span className="ask-dots"><i /><i /><i /></span>Finding sources…</div>;
}

const meterText = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`);
const minText = (m: number) => `${Math.max(1, Math.round(m))} min`;
type AskAction = NonNullable<AskTurn["action"]>;

// 길 묻기(T-43): 목적지까지 걸어서 거리·시간을 보여 주고 안내를 시작하는 버튼
function RouteCard({ to }: { to: string }) {
  const { go } = useApp();
  const pos = useVisit().position;
  const [info, setInfo] = useState<"loading" | "error" | { meters: number; minutes: number; fromGate: boolean }>("loading");
  useEffect(() => {
    let off = false;
    loadRouteData().then((data) => {
      if (off) return;
      const stop = data.stops.get(to);
      const { here, fromGate } = startPoint(data, pos ? [pos.lng, pos.lat] : null);
      const r = stop ? legTo(data, here, stop) : null;
      setInfo(r ? { meters: r.meters, minutes: r.minutes, fromGate } : "error");
    }).catch(() => { if (!off) setInfo("error"); });
    return () => { off = true; };
  }, [to, pos?.lat, pos?.lng]);

  if (info === "loading") return <div className="map-soon"><small>Finding the walking route…</small></div>;
  if (info === "error") return <div className="map-soon">
    <Icon name="route" size={26} /><strong>We couldn't find a walking route</strong>
    <small>Please find the building on the map or in the list.</small>
    <button className="ask-btn" onClick={() => go("T-10")}>Open the map</button>
  </div>;
  return <div className="map-soon">
    <Icon name="route" size={26} /><strong>{meterText(info.meters)} · {minText(info.minutes)} on foot</strong>
    <small>{info.fromGate ? "Measured from Gwanghwamun Gate because your position isn't available." : "Measured from your current position."}</small>
    <button className="ask-btn" onClick={() => { void navigateTo(to); go("T-16"); }}>Start navigation</button>
  </div>;
}

// 근처 편의시설(T-44): 걸어서 가까운 3곳을 보여 주고 고르면 안내 시작
function AmenityCard({ category }: { category: "restroom" | "bench" | "water" }) {
  const { go } = useApp();
  const lang = useLanguage();
  const pos = useVisit().position;
  const [list, setList] = useState<"loading" | "error" | { stop: RouteStop; meters: number; minutes: number }[]>("loading");
  const [fromGate, setFromGate] = useState(false);
  useEffect(() => {
    let off = false;
    loadRouteData().then((data) => {
      if (off) return;
      const start = startPoint(data, pos ? [pos.lng, pos.lat] : null);
      setFromGate(start.fromGate);
      setList(amenitiesNear(data, start.here, category, 3).map((a) => ({ stop: amenityStop(data, a, category), meters: a.meters, minutes: a.minutes })));
    }).catch(() => { if (!off) setList("error"); });
    return () => { off = true; };
  }, [category, pos?.lat, pos?.lng]);

  if (list === "loading") return <div className="map-soon"><small>Finding the nearest spots…</small></div>;
  if (list === "error" || list.length === 0) return <div className="map-soon">
    <Icon name="location" size={26} /><strong>We couldn't find a nearby spot</strong>
    <button className="ask-btn" onClick={() => go("T-10")}>Open the map</button>
  </div>;
  return <div className="map-soon">
    <Icon name="location" size={26} /><strong>Nearest on foot</strong>
    <small>{fromGate ? "Measured from Gwanghwamun Gate because your position isn't available." : "Tap one to get walking directions."}</small>
    <div className="ask-actions">{list.map((item, i) => <button key={item.stop.id} className="ask-btn" onClick={() => { void navigateToStop(item.stop); go("T-16"); }}>
      {(lang === "th" ? item.stop.name.th : item.stop.name.en)} {i + 1} · {meterText(item.meters)} · {minText(item.minutes)}</button>)}</div>
  </div>;
}

// 서버가 준 action 에 맞는 카드 (action 이 없으면 시안 예시용 안내)
function MapCard({ action, kind }: { action?: AskAction | null; kind: "route" | "amenity" }) {
  const { go } = useApp();
  if (action?.type === "route") return <RouteCard to={action.to} />;
  if (action?.type === "amenity") return <AmenityCard category={action.category} />;
  return <div className="map-soon">
    <Icon name={kind === "route" ? "route" : "location"} size={26} />
    <strong>Walking directions appear here</strong>
    <small>{kind === "route" ? "Ask for a building to see how to get there." : "Ask for a restroom, bench or water to see the nearest spots."}</small>
    <button className="ask-btn" onClick={() => go("T-10")}>Open the map</button>
  </div>;
}

export function Chat({ mode = "answer" }: { mode?: ChatMode }) {
  const { screen, setNoun, chatQuestion, go } = useApp();
  const turns = useAskTurns();
  const endRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  // 새 질문·답변이 생기면 맨 아래로
  const last = turns[turns.length - 1];
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" }); }, [turns.length, last?.status]);

  const retry = (id: number) => retryTurn(id, (next) => { if (CHAT_SCREENS.includes(screenRef.current)) go(next, true); });
  const onCard = (id: string) => setNoun(`card:${id}`);

  function bot(turn: AskTurn) {
    if (turn.status === "loading") return <Loading />;
    if (turn.status === "error") return <>
      <p>{askErrorText(turn.errorKind)}</p>
      <div className="ask-actions"><button className="ask-btn" onClick={() => retry(turn.id)}>Try again</button></div>
    </>;
    return <>
      <AnswerText text={turn.answer ?? ""} onCard={onCard} />
      {turn.kind === "noEvidence" && <div className="ask-actions"><button className="ask-btn" onClick={() => go("T-11")}>Browse the building list</button></div>}
      {(turn.kind === "route" || turn.kind === "amenity") && <MapCard action={turn.action} kind={turn.kind} />}
    </>;
  }

  return <div className="chat-screen"><ScreenHeader title="Ask GungGeum" /><div className="chat-body">
    {turns.length === 0
      ? <>
        <div className="user-bubble">{chatQuestion}</div>
        <div className="bot-row"><span className="bot-icon">G</span><div className="bot-copy">
          <AnswerText text={SAMPLE[mode]} onCard={onCard} />
          {mode === "noEvidence" && <div className="ask-actions"><button className="ask-btn" onClick={() => go("T-11")}>Browse the building list</button></div>}
          {(mode === "route" || mode === "amenity") && <MapCard kind={mode} />}
          {mode === "rateLimited" && <div className="ask-actions"><button className="ask-btn" onClick={() => go("T-40")}>Try again</button></div>}
        </div></div></>
      : turns.map((turn) => <Fragment key={turn.id}>
        <div className="user-bubble">{turn.question}</div>
        <div className="bot-row"><span className="bot-icon">G</span><div className="bot-copy">{bot(turn)}</div></div>
      </Fragment>)}
    <div ref={endRef} />
  </div><ChatInput /></div>;
}
