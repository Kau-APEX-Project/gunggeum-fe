import { type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { useAskTurn } from "@/lib/askStore";

export function ChatInput() {
  const { query, setQuery, ask } = useApp();
  const turn = useAskTurn();
  const busy = turn?.status === "loading"; // 답을 기다리는 중에는 새 질문을 보내지 않음
  function submit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q && !busy) ask(q);
  }
  // 서버는 질문을 1~300자로 받음(넘으면 400). 입력 단계에서 300자로 막는다
  return <form className="chat-input" onSubmit={submit}>
    <input value={query} onChange={(e) => setQuery(e.target.value)} maxLength={300} placeholder="Ask about the palace…" />
    <button aria-label="Send" disabled={busy || !query.trim()}><Icon name="send" size={18} /></button>
  </form>;
}
