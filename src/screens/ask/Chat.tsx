import { Fragment, useEffect, useRef } from "react";
import "@/styles/connect.css";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { askErrorText } from "@/lib/apiTypes";
import { retryTurn, useAskTurns, type AskTurn } from "@/lib/askStore";
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

// 지도 안내는 준비 중 (길 안내 모듈 연결 전)
function MapSoon({ kind }: { kind: "route" | "amenity" }) {
  const { go } = useApp();
  return <div className="map-soon">
    <Icon name={kind === "route" ? "route" : "location"} size={26} />
    <strong>Map directions are coming soon</strong>
    <small>{kind === "route" ? "For now, find the building on the map or in the list." : "Restroom, bench and water spots will appear on the map."}</small>
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
      {(turn.kind === "route" || turn.kind === "amenity") && <MapSoon kind={turn.kind} />}
    </>;
  }

  return <div className="chat-screen"><ScreenHeader title="Ask GungGeum" /><div className="chat-body">
    {turns.length === 0
      ? <>
        <div className="user-bubble">{chatQuestion}</div>
        <div className="bot-row"><span className="bot-icon">G</span><div className="bot-copy">
          <AnswerText text={SAMPLE[mode]} onCard={onCard} />
          {mode === "noEvidence" && <div className="ask-actions"><button className="ask-btn" onClick={() => go("T-11")}>Browse the building list</button></div>}
          {(mode === "route" || mode === "amenity") && <MapSoon kind={mode} />}
          {mode === "rateLimited" && <div className="ask-actions"><button className="ask-btn" onClick={() => go("T-40")}>Try again</button></div>}
        </div></div></>
      : turns.map((turn) => <Fragment key={turn.id}>
        <div className="user-bubble">{turn.question}</div>
        <div className="bot-row"><span className="bot-icon">G</span><div className="bot-copy">{bot(turn)}</div></div>
      </Fragment>)}
    <div ref={endRef} />
  </div><ChatInput /></div>;
}
