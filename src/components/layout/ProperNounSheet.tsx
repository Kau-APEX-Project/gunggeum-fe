import { useEffect, useState } from "react";
import "@/styles/connect.css";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { buildings } from "@/data/buildings";
import { usePlaces } from "@/data/places";
import { useApp } from "@/context/AppContext";
import { assetUrl } from "@/lib/assets";
import { useCard } from "@/lib/cards";
import { useLanguage } from "@/lib/language";

const CAPTION = "Photo: AI Hub dataset · AI Hub terms of use";
const CLAMP = 280; // 긴 설명은 앞부분만 보이고 Read more 로 펼침

// 고유명사 카드(하단 시트)
// noun 이 card:b-160처럼 카드 번호면 서버에서 카드를 받아 오고 그렇지 않으면 예전 샘플 데이터를 보여줌
export function ProperNounSheet() {
  const { noun, setNoun, go, goToPlace } = useApp();
  const lang = useLanguage();
  const { places } = usePlaces();
  const cardId = noun?.startsWith("card:") ? noun.slice(5) : null;
  const card = useCard(cardId);
  const [expanded, setExpanded] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  useEffect(() => { setExpanded(false); }, [noun]);
  if (!noun) return null;
  const close = () => setNoun(null);

  // ---------- 서버 카드 ----------
  if (cardId) {
    const c = card.card;
    const title = c ? (lang === "th" ? c.name_th ?? c.name_en : c.name_en) ?? c.name : "";
    const body = c ? (lang === "th" ? c.text_th : c.text_en) ?? c.text : "";
    const long = body.length > CLAMP;
    const shown = expanded || !long ? body : `${body.slice(0, CLAMP).trimEnd()}…`;
    const serial = c?.type === "building" ? Number(c.id.replace(/^b-/, "")) : NaN;
    const place = places.find((p) => p.serial === serial);
    const photoOk = !!c?.photo && failedPhoto !== c.photo;
    return <div className="sheet-backdrop" onClick={close}>
      <section className="bottom-sheet card-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={close} aria-label="Close"><Icon name="close" /></button>
        {card.status === "loading" && <p className="card-status" role="status">Loading…</p>}
        {card.status === "error" && <><p className="card-status">We couldn't load this card.</p><button className="text-link" onClick={card.reload}>Try again</button></>}
        {c && <>
          {photoOk
            ? <div className="sheet-photo"><img src={assetUrl(c.photo!)} alt={title} onError={() => setFailedPhoto(c.photo)} /></div>
            : <Photo label={title} className="sheet-photo" />}
          {photoOk && (c.photo_source || c.photo_license) && <p className="photo-caption">Photo: {[c.photo_source, c.photo_license].filter(Boolean).join(" · ")}</p>}
          <span className="tag">{c.type === "building" ? "Building" : c.category ?? "Term"}</span>
          <h2>{title}</h2><p className="korean">{c.name}</p>
          <p>{shown}</p>
          {long && <button className="read-more" onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Read more"}</button>}
          {c.type === "building" && <button className="text-link" onClick={() => { close(); if (place) goToPlace(place.id); else go("T-12"); }}>Open building guide <Icon name="chevron" size={16} /></button>}
        </>}
      </section>
    </div>;
  }

  // ---------- 예전 샘플 (시안 목록의 Components 항목 등) ----------
  const building = buildings.find((b) => b[0] === noun);
  const details: Record<string, [string, string, string]> = {
    "King Sejong": ["세종대왕", "Person", "The fourth king of Joseon, remembered for creating Hangul."],
    "Irworobongdo": ["일월오봉도", "Artifact", "A royal screen of the sun, moon, and five peaks behind the throne."],
    "Eojwa throne": ["어좌", "Artifact", "The ceremonial throne representing the authority of the king."],
  };
  const korean = building?.[1] || details[noun]?.[0] || "일월오봉도";
  const category = building ? "Building" : details[noun]?.[1] || "Artifact";
  const desc = building?.[2] || details[noun]?.[2] || "An important term in the history of Gyeongbokgung Palace.";
  return <div className="sheet-backdrop" onClick={close}>
    <section className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
      <div className="sheet-handle" />
      <button className="sheet-close" onClick={close}><Icon name="close" /></button>
      <Photo label={noun} className="sheet-photo" />
      {building && <p className="photo-caption">{CAPTION}</p>}
      <span className="tag">{category}</span>
      <h2>{noun}</h2><p className="korean">{korean}</p><p>{desc}</p>
      {building && <button className="text-link" onClick={() => { close(); go("T-12"); }}>Open building guide <Icon name="chevron" size={16} /></button>}
    </section>
  </div>;
}
