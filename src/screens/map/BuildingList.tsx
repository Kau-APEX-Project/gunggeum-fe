import { useState } from "react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { isFeatured, typeLabel, usePlaces } from "@/data/places";
import { useApp } from "@/context/AppContext";

export function BuildingList() {
  const { goToPlace } = useApp();
  const { places, status } = usePlaces();
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();

  // 한글명 · 영어명 · 태국어명 · 건물 유형에서 검색
  const results = places.filter(isFeatured).filter((p) =>
    keyword === "" ||
    p.ko.includes(keyword) ||
    p.en.toLowerCase().includes(keyword) ||
    p.th.includes(keyword) ||
    typeLabel(p.category).toLowerCase().includes(keyword)
  );

  return <div className="screen-pad"><ScreenHeader title="Buildings" />
    <label className="search-box">
      <Icon name="search" size={18} />
      <input placeholder="Search buildings" value={query} onChange={(e) => setQuery(e.target.value)} />
    </label>
    {status === "loading" && <p className="count-label">Loading…</p>}
    {status === "error" && <p className="count-label">Couldn't load the list. Please check your connection.</p>}
    {status === "ready" && <p className="count-label">{results.length} {results.length === 1 ? "place" : "places"}</p>}
    <div className="building-list">
      {status === "ready" && results.length === 0 && <p className="count-label">No buildings found</p>}
      {results.map((p) => <button className="building-card" key={p.id} onClick={() => goToPlace(p.id)}>
        <Photo label={p.en} />
        <span className="building-copy"><strong>{p.en}</strong><small>{p.ko} · {typeLabel(p.category)}</small></span>
        <Icon name="chevron" size={18} />
      </button>)}
    </div>
  </div>;
}
