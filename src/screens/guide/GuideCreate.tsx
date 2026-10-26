import { Button } from "@/components/ui/Button";
import { guideLangs } from "@/data/guide";
import { genSessionCode } from "@/lib/format";
import { GuideBrand } from "@/screens/guide/GuideBrand";
import { useApp } from "@/context/AppContext";

export function GuideCreate() {
  const { guideConsent, setGuideConsent, langs, setLangs, duration, setDuration, setSessionCode, go, startSession } = useApp();
  return <div className="guide-screen compact screen-pad"><GuideBrand /><h1>Create interpretation session</h1><p>Create an official interpretation session. Tourists join from the Live Tour lobby while it is live.</p>
    <label className="field-label">Tour title<input defaultValue="Afternoon Palace Tour" /></label>
    <div className="two-col"><label className="field-label">Tour date<input type="date" defaultValue="2026-10-05" /></label><label className="field-label">Start time<input type="time" defaultValue="14:00" /></label></div>
    <div className="field-label">Expected duration<div className="chips">{["60 min", "90 min", "120 min"].map((d) => <button key={d} className={duration === d ? "selected" : ""} onClick={() => setDuration(d)}>{d}</button>)}</div></div>
    <div className="field-label">Source language<div className="fixed-field">Korean (한국어) <span>Fixed</span></div></div>
    <div className="field-label">Interpretation languages<div className="chips wrap">{guideLangs.map((l) => <button key={l} className={langs.includes(l) ? "selected" : ""} onClick={() => setLangs(langs.includes(l) ? langs.filter((x) => x !== l) : [...langs, l])}>{l}</button>)}</div></div>
    <label className="consent"><input type="checkbox" checked={guideConsent} onChange={(e) => setGuideConsent(e.target.checked)} /><span>I agree that my voice is converted to text and <strong>NOT stored.</strong></span></label>
    <p className="privacy-copy">Your speech is transcribed and translated in real time, then discarded. No audio recordings are kept; only subtitle text is shown to tourists during the session.</p>
    <div className="flow-buttons"><Button disabled={!guideConsent || langs.length === 0} onClick={() => { setSessionCode(genSessionCode()); startSession(); go("G-02"); }}>Create session</Button><button className="text-button" onClick={() => go("G-05")}>Back to dashboard</button></div></div>;
}
