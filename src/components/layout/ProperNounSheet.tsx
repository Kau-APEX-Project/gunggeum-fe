import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { buildings } from "@/data/buildings";
import { useApp } from "@/context/AppContext";

export function ProperNounSheet() {
  const { noun, setNoun, go } = useApp();
  if (!noun) return null;
  const building = buildings.find((b) => b[0] === noun);
  const details: Record<string, [string, string, string]> = {
    "King Sejong": ["세종대왕", "Person", "The fourth king of Joseon, remembered for creating Hangul."],
    "Irworobongdo": ["일월오봉도", "Artifact", "A royal screen of the sun, moon, and five peaks behind the throne."],
    "Eojwa throne": ["어좌", "Artifact", "The ceremonial throne representing the authority of the king."],
  };
  const korean = building?.[1] || details[noun]?.[0] || "일월오봉도";
  const category = building ? "Building" : details[noun]?.[1] || "Artifact";
  const desc = building?.[2] || details[noun]?.[2] || "An important term in the history of Gyeongbokgung Palace.";
  return <div className="sheet-backdrop" onClick={() => setNoun(null)}>
    <section className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
      <div className="sheet-handle" />
      <button className="sheet-close" onClick={() => setNoun(null)}><Icon name="close" /></button>
      <Photo label={noun} className="sheet-photo" />
      <span className="tag">{category}</span>
      <h2>{noun}</h2><p className="korean">{korean}</p><p>{desc}</p>
      {building && <button className="text-link" onClick={() => { setNoun(null); go("T-12"); }}>Open building guide <Icon name="chevron" size={16} /></button>}
    </section>
  </div>;
}
