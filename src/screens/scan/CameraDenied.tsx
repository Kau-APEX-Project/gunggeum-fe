import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { buildings } from "@/data/buildings";
import { useApp } from "@/context/AppContext";

export function CameraDenied() {
  const { setSettingsNote, go, notify } = useApp();
  return <div className="screen-pad permission"><ScreenHeader title="Camera access" /><div className="line-illustration"><Icon name="camera" size={50} /></div><h2>Camera access is off</h2><p><strong>Camera permission is required to scan.</strong><br />Allow camera access in your device settings to identify palace buildings.</p><div className="bottom-buttons"><Button onClick={() => { setSettingsNote(true); notify("Opening device settings… (simulated)"); }}>Open settings</Button><button className="text-button" onClick={() => go("T-11")}>Choose from list instead</button></div></div>;
}
