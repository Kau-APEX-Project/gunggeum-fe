import { type ReactNode } from "react";

export function Proper({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="proper" onClick={onClick}>{children}</button>;
}
