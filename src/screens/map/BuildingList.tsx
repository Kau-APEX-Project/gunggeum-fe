import { useState } from "react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { buildings } from "@/data/buildings";
import { useApp } from "@/context/AppContext";

export function BuildingList() {
  const { go } = useApp();
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();

  const results = buildings
    .map((b, i) => ({ b, i }))
    .filter(({ b }) =>
      keyword === "" ||
      b[0].toLowerCase().includes(keyword) || // 영문명
      b[1].includes(keyword) ||               // 한글명
      b[3].toLowerCase().includes(keyword)    // 건물 유형
    );

  return <div className="screen-pad"><ScreenHeader title="Buildings" />
    <label className="search-box">
      <Icon name="search" size={18} />
      <input
        placeholder="Search buildings"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </label>
    <p className="count-label">{results.length} {results.length === 1 ? "place" : "places"}</p>
    <div className="building-list">
      {results.length === 0 && <p className="count-label">No buildings found</p>}
      {results.map(({ b, i }) => <button className="building-card" key={b[0]} onClick={() => go("T-12")}><Photo label={b[0]} /><span className="building-copy"><strong>{b[0]}</strong><small>{b[3]} · {120 + i * 35}m away</small><em><Icon name="headphones" size={13} /> {b[4]}</em></span><Icon name="chevron" size={18} /></button>)}
    </div>
  </div>;
}
