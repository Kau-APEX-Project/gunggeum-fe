import "@/styles/connect.css";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { askErrorText } from "@/lib/apiTypes";
import { useAskTurn } from "@/lib/askStore";
import { AnswerText } from "@/screens/ask/AnswerText";
import { ChatInput } from "@/screens/ask/ChatInput";

// T-41 답변 · T-42 근거 없음 · T-43 길 묻기 · T-44 편의시설 · S-06 요청 과다 가 같은 채팅 화면을 사용함
export type ChatMode = "answer" | "noEvidence" | "route" | "amenity" | "rateLimited";

// 아직 질문한 적이 없을 때(시안 목록에서 바로 열었을 때) 보여주는 예시 문장
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
  const { setNoun, chatQuestion, go, ask } = useApp();
  const turn = useAskTurn();
  const question = turn?.question ?? chatQuestion;
  const loading = turn?.status === "loading";
  const failed = turn?.status === "error" && mode !== "rateLimited";
  const text = mode === "rateLimited" ? SAMPLE.rateLimited : turn?.status === "done" && turn.answer ? turn.answer : SAMPLE[mode];
  return <div className="chat-screen"><ScreenHeader title="Ask GungGeum" /><div className="chat-body"><div className="user-bubble">{question}</div><div className="bot-row"><span className="bot-icon">G</span><div className="bot-copy">
    {loading ? <Loading /> : failed ? <>
      <p>{askErrorText(turn?.errorKind)}</p>
      <div className="ask-actions"><button className="ask-btn" onClick={() => ask(question)}>Try again</button></div>
    </> : <>
      <AnswerText text={text} onCard={(id) => setNoun(`card:${id}`)} />
      {mode === "noEvidence" && <div className="ask-actions"><button className="ask-btn" onClick={() => go("T-11")}>Browse the building list</button></div>}
      {(mode === "route" || mode === "amenity") && <MapSoon kind={mode} />}
      {mode === "rateLimited" && <div className="ask-actions"><button className="ask-btn" onClick={() => go("T-40")}>Try again</button></div>}
    </>}
  </div></div></div><ChatInput /></div>;
}
