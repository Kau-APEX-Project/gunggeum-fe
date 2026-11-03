import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { setLanguage, useLanguage, type Lang } from "@/lib/language";

// code 가 있는 언어만 선택할 수 있음(영어, 태국어). 나머지는 커밍쑨
const rows: { code: Lang | null; label: string }[] = [
  { code: "en", label: "English" },
  { code: "th", label: "ไทย" },
  { code: null, label: "Tiếng Việt" },
  { code: null, label: "Bahasa Indonesia" },
];

export function Language() {
  const { go, back, history } = useApp();
  const current = useLanguage();
  // 처음 들어온 경우(T-00 > T-01)는 다음 온보딩 단계로, 상단 언어 칩으로 들어온 경우는 원래 화면으로 돌아간다
  const fromOnboarding = history.at(-1) === "T-00";
  return <div className="screen-pad"><ScreenHeader title="Choose your language" /><p className="intro">You can change this later.</p>
    <div className="language-list">
      {rows.map(({ code, label }) => {
        const selected = code !== null && code === current;
        return <button key={label} className={`language-row ${selected ? "selected" : ""}`} disabled={code === null}
          onClick={() => { if (code) { setLanguage(code); if (fromOnboarding) go("T-02"); else back(); } }}>
          <span><strong>{label}</strong>{code === null && <small>Coming soon</small>}</span>
          {selected && <span className="radio"><Icon name="check" size={14} /></span>}
        </button>;
      })}
    </div>
  </div>;
}
