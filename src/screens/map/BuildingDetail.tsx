import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { Proper } from "@/components/ui/Proper";
import { useApp } from "@/context/AppContext";
import { typeLabel, usePlaces } from "@/data/places";

const SAMPLE_SERIAL = 160; // 지금 화면에 들어 있는 샘플 설명은 근정전(serial 160)

export function BuildingDetail() {
  const { setNoun, setAudio, setAudioPlaying, ask, go, selectedPlaceId } = useApp();
  const { places } = usePlaces();
  // 지도 핀이나 목록에서 고른 건물이 있으면 그 건물을, 없으면(도착 알림·스캔 등) 샘플(근정전)을 보여준다
  const picked = places.find((p) => p.id === selectedPlaceId);
  const name = picked?.en ?? "Geunjeongjeon";
  const korean = picked?.ko ?? "근정전";
  const tag = picked ? typeLabel(picked.category).toUpperCase() : "THRONE HALL";
  const hasSample = !picked || picked.serial === SAMPLE_SERIAL; // 설명문이 있는 건물만 샘플 설명을 보여줌
  return <div className="detail-screen"><ScreenHeader title="Building guide" /><Photo label={name} className="hero-photo" /><div className="detail-body">
    <span className="tag">{tag}</span><h1>{name}</h1><p className="korean">{korean}</p>
    <Button onClick={() => { setAudio(true); setAudioPlaying(true); }}><Icon name="headphones" /> Play audio guide {hasSample && <span>4 min</span>}</Button>
    <h3>About this place</h3>{hasSample ? <p className="body-copy">This was the palace's most important ceremonial hall. The king received officials here and held major state events. Behind the <Proper onClick={() => setNoun("Eojwa throne")}>Eojwa throne</Proper> is the <Proper onClick={() => setNoun("Irworobongdo")}>Irworobongdo</Proper>, a screen representing royal authority. During the reign of <Proper onClick={() => setNoun("King Sejong")}>King Sejong</Proper>, the hall was central to court life.</p> : <p className="body-copy">A detailed description of this building is coming soon.</p>}
    <div className="detail-actions"><Button secondary onClick={() => go("T-16")}><Icon name="route" /> Navigate here</Button><Button secondary onClick={() => { ask(`Tell me more about ${name}`); }}><Icon name="ask" /> Ask about this building</Button></div>
  </div></div>;
}
