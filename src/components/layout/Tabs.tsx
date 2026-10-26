import { Icon } from "@/components/ui/Icon";
import type { IconName, ScreenId } from "@/types";
import { useApp } from "@/context/AppContext";

export function Tabs() {
  const { screen, go } = useApp();
  const tabs: [string, IconName, ScreenId][] = [["Map", "map", "T-10"], ["Scan", "camera", "T-20"], ["Live Tour", "tour", "T-30"], ["Ask", "search", "T-40"]];
  const active = screen.startsWith("T-2") || screen === "S-05" ? "Scan" : screen.startsWith("T-3") || screen === "S-02" || screen === "S-04" ? "Live Tour" : screen.startsWith("T-4") ? "Ask" : "Map";
  const disabled = screen === "S-01";
  return <nav className="tabs">
    {tabs.map(([label, icon, id]) => {
      const isDisabled = disabled && (label === "Live Tour" || label === "Ask");
      return <button key={label} disabled={isDisabled} className={active === label ? "active" : ""} onClick={() => go(id)}>
        <Icon name={icon} size={21} /><span>{label}</span>
      </button>;
    })}
  </nav>;
}
