import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { Proper } from "@/components/ui/Proper";
import { useApp } from "@/context/AppContext";

export function BuildingDetail() {
  const { setNoun, setAudio, setAudioPlaying, setChatQuestion, go } = useApp();
  return <div className="detail-screen"><ScreenHeader title="Building guide" /><Photo label="Geunjeongjeon" className="hero-photo" /><div className="detail-body">
    <span className="tag">THRONE HALL</span><h1>Geunjeongjeon</h1><p className="korean">근정전</p>
    <Button onClick={() => { setAudio(true); setAudioPlaying(true); }}><Icon name="headphones" /> Play audio guide <span>4 min</span></Button>
    <h3>About this place</h3><p className="body-copy">This was the palace's most important ceremonial hall. The king received officials here and held major state events. Behind the <Proper onClick={() => setNoun("Eojwa throne")}>Eojwa throne</Proper> is the <Proper onClick={() => setNoun("Irworobongdo")}>Irworobongdo</Proper>, a screen representing royal authority. During the reign of <Proper onClick={() => setNoun("King Sejong")}>King Sejong</Proper>, the hall was central to court life.</p>
    <div className="detail-actions"><Button secondary onClick={() => go("T-16")}><Icon name="route" /> Navigate here</Button><Button secondary onClick={() => { setChatQuestion("Tell me more about Geunjeongjeon"); go("T-41"); }}><Icon name="ask" /> Ask about this building</Button></div>
  </div></div>;
}
