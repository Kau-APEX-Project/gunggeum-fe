import { Proper } from "@/components/ui/Proper";
import { splitAnswer } from "@/screens/ask/answerParse";

// 답변 글을 그림. 카드 링크는 빨간 밑줄 고유명사(탭하면 카드 열림)로 보인다 
export function AnswerText({ text, onCard }: { text: string; onCard: (cardId: string) => void }) {
  return <>{splitAnswer(text).map((parts, i) => <p key={i}>
    {parts.map((part, j) => part.kind === "text"
      ? <span key={j}>{part.text}</span>
      : <Proper key={j} onClick={() => onCard(part.id)}>{part.label}</Proper>)}
  </p>)}</>;
}
