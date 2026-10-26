import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";

export function Language() {
  const { go } = useApp();
  return <div className="screen-pad"><ScreenHeader title="Choose your language" /><p className="intro">You can change this later.</p>
    <div className="language-list">
      {["English", "Tiếng Việt", "ไทย", "Bahasa Indonesia"].map((language, i) => <button key={language} className={`language-row ${i === 0 ? "selected" : ""}`} disabled={i > 0} onClick={() => i === 0 && go("T-02")}>
        <span><strong>{language}</strong>{i > 0 && <small>Coming soon</small>}</span>{i === 0 && <span className="radio"><Icon name="check" size={14} /></span>}
      </button>)}
    </div>
  </div>;
}
