import { Icon } from "@/components/ui/Icon";
import { ChatInput } from "@/screens/ask/ChatInput";
import { useApp } from "@/context/AppContext";

export function AskStart() {
  const { ask } = useApp();
  const suggestions = ["Why is Gyeonghoeru built on water?", "Where did the king sleep?", "What is the painting behind the throne?"];
  return <div className="screen-pad ask-start"><div className="ask-mark"><Icon name="search" size={32} /></div><h1>Ask GungGeum</h1><p>Ask anything about Gyeongbokgung in your language. Answers are based on official Korea Heritage Service materials.</p><h3>Try asking</h3><div className="suggestions">{suggestions.map((q) => <button key={q} onClick={() => ask(q)}>{q}<Icon name="chevron" size={16} /></button>)}</div><ChatInput /></div>;
}
