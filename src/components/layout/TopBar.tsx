import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";

export function TopBar() {
  const { go } = useApp();
  return <header className="topbar">
    <button className="brand" onClick={() => go("T-10")}>GungGeum</button>
    <div className="top-actions">
      <button className="lang" onClick={() => go("T-01")}>EN ▾</button>
      <button className="icon-btn" aria-label="Notices" onClick={() => go("T-50")}><Icon name="bell" /></button>
      <button className="icon-btn" aria-label="Passport" onClick={() => go("T-51")}><Icon name="stamp" /></button>
    </div>
  </header>;
}
