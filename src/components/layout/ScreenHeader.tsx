import { type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";

export function ScreenHeader({ title, action }: { title: string; action?: ReactNode }) {
  const { back } = useApp();
  return <div className="screen-header"><button onClick={back}><Icon name="arrow" /></button><h1>{title}</h1>{action || <span className="header-spacer" />}</div>;
}
