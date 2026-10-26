import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";

export function Permission() {
  const { go } = useApp();
  return <div className="screen-pad permission"><ScreenHeader title="Location guide" /><div className="line-illustration"><Icon name="location" size={54} /></div>
    <h2>Hear the right story,<br />at the right place</h2>
    <p>GungGeum uses your location to detect when you arrive at a building and automatically suggest its audio guide.</p>
    <div className="privacy-note"><Icon name="check" />Your precise location is never stored.</div>
    <div className="bottom-buttons"><Button onClick={() => go("T-10")}>Allow location</Button><button className="text-button" onClick={() => go("T-10")}>Not now</button></div>
  </div>;
}
