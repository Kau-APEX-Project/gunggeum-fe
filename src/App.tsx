import { AppProvider, useApp } from "@/context/AppContext";
import { ScreenRouter } from "@/ScreenRouter";
import { TopBar } from "@/components/layout/TopBar";
import { Tabs } from "@/components/layout/Tabs";
import { AudioPlayer } from "@/components/layout/AudioPlayer";
import { ProperNounSheet } from "@/components/layout/ProperNounSheet";
import { ScreenIndex } from "@/components/dev/ScreenIndex";

function Shell() {
  const { screen, guideMode, onboarding, cameraScreen, audio, toast } = useApp();
  const showChrome = !onboarding && !guideMode && !cameraScreen;
  return <div className="prototype-canvas">
    <div className={`phone ${cameraScreen ? "camera-mode" : ""}`}>
      <span className="screen-id">{screen}</span>
      {showChrome && <TopBar />}
      <main className={`phone-content ${!showChrome ? "full" : audio ? "with-audio" : ""}`}><ScreenRouter /></main>
      {showChrome && <><AudioPlayer /><Tabs /></>}
      <ProperNounSheet />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
    <ScreenIndex />
  </div>;
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
