import { type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";

export function ChatInput() {
  const { query, setQuery, ask } = useApp();
  function submit(e: FormEvent) { e.preventDefault(); if (query.trim()) ask(query.trim()); }
  return <form className="chat-input" onSubmit={submit}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask about the palace…" /><button aria-label="Send"><Icon name="send" size={18} /></button></form>;
}
