import { type ReactNode } from "react";

export function Button({ children, onClick, secondary = false, disabled = false, className = "" }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean; className?: string }) {
  return <button disabled={disabled} onClick={onClick} className={`button ${secondary ? "button-secondary" : ""} ${className}`}>{children}</button>;
}
