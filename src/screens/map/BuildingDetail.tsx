import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { useApp } from "@/context/AppContext";
import { typeLabel, usePlaces } from "@/data/places";
import { setGuideTrack } from "@/lib/audioStore";
import { assetUrl } from "@/lib/assets";
import { useCard } from "@/lib/cards";
import { useLanguage } from "@/lib/language";
import { navigateTo } from "@/lib/navStore";
import { AnswerText } from "@/screens/ask/AnswerText";

const SAMPLE_SERIAL = 160; // 건물을 고르지 않고 들어오면(도착 알림·스캔 등) 근정전(serial 160)을 보여 줌

export function BuildingDetail() {
  const { setNoun, setAudio, setAudioPlaying, ask, go, selectedPlaceId } = useApp();
  const { places } = usePlaces();
  const lang = useLanguage();
  const picked = places.find((p) => p.id === selectedPlaceId);
  const shown = picked ?? places.find((p) => p.serial === SAMPLE_SERIAL);
  const name = shown?.en ?? "Geunjeongjeon";
  const korean = shown?.ko ?? "근정전";
  const tag = shown ? typeLabel(shown.category).toUpperCase() : "HALL";

  // 설명과 사진은 서버 카드(b-<serial>)에서 받아 옴
  const card = useCard(`b-${shown?.serial ?? SAMPLE_SERIAL}`);
  const c = card.card;
  const body = c ? (lang === "th" ? c.text_th ?? c.text_en : c.text_en) ?? c.text : "";
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  useEffect(() => { setFailedPhoto(null); }, [shown?.id]);
  const photoOk = !!c?.photo && failedPhoto !== c.photo;

  return <div className="detail-screen"><ScreenHeader title="Building guide" />
    {photoOk
      ? <img className="hero-photo" style={{ objectFit: "cover", display: "block" }} src={assetUrl(c!.photo!)} alt={name} onError={() => setFailedPhoto(c!.photo)} />
      : <Photo label={name} className="hero-photo" />}
    {photoOk && (c?.photo_source || c?.photo_license) && <p className="photo-caption" style={{ margin: "4px 20px 0" }}>Photo: {[c?.photo_source, c?.photo_license].filter(Boolean).join(" · ")}</p>}
    <div className="detail-body">
    <span className="tag">{tag}</span><h1>{name}</h1><p className="korean">{korean}</p>
    <Button onClick={() => { setGuideTrack(shown ?? null); setAudio(true); setAudioPlaying(true); }}><Icon name="headphones" /> Play audio guide</Button>
    <h3>About this place</h3>
    {card.status === "loading" && <p className="body-copy" role="status">Loading…</p>}
    {card.status === "error" && <><p className="body-copy">We couldn't load the description.</p><button className="text-link" onClick={card.reload}>Try again</button></>}
    {c && <div className="body-copy"><AnswerText text={body} onCard={(id) => setNoun(`card:${id}`)} /></div>}
    <div className="detail-actions"><Button secondary onClick={() => { void navigateTo(shown?.id ?? "place:geunjeongjeon-hall"); go("T-16"); }}><Icon name="route" /> Navigate here</Button><Button secondary onClick={() => { ask(`Tell me more about ${name}`); }}><Icon name="ask" /> Ask about this building</Button></div>
  </div></div>;
}
