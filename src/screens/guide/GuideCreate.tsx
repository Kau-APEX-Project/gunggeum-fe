import { useState } from "react";
import "@/styles/connect.css";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { createSession } from "@/lib/api";
import { ApiError, sessionErrorText } from "@/lib/apiTypes";
import { saveSession } from "@/lib/sessionStore";
import { GuideBrand } from "@/screens/guide/GuideBrand";

// G-01 세션 만들기. 기능명세서 v0.3 기준: 제목(선택), 가이드 접근 코드, 원본 언어(한국어 고정), 음성 미저장 동의.
export function GuideCreate() {
  const { guideConsent, setGuideConsent, go } = useApp();
  const [title, setTitle] = useState("Afternoon Palace Tour");
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState(false); // 접근 코드가 틀림 (403)
  const [notice, setNotice] = useState("");           // 그 밖의 오류 문구

  async function create() {
    setBusy(true);
    setCodeError(false);
    setNotice("");
    try {
      const cleanTitle = title.trim();
      const s = await createSession({ consent: true, accessCode: accessCode.trim(), title: cleanTitle || undefined });
      saveSession({ code: s.code, joinUrl: s.joinUrl, guideToken: s.guideToken, title: cleanTitle || "Palace tour", startedAt: s.startedAt });
      go("G-02");
    } catch (e) {
      const kind = e instanceof ApiError ? e.kind : "network";
      if (kind === "forbidden") setCodeError(true);
      else setNotice(sessionErrorText(kind));
    } finally {
      setBusy(false);
    }
  }

  return <div className="guide-screen compact screen-pad"><GuideBrand /><h1>Create interpretation session</h1><p>Create an official interpretation session. Tourists join from the Live Tour lobby while it is live.</p>
    <label className="field-label">Tour title (optional)<input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} /></label>
    <label className="field-label">Guide access code<input type="password" autoComplete="off" placeholder="Enter the code you were given" value={accessCode} onChange={(e) => { setAccessCode(e.target.value); setCodeError(false); }} /></label>
    {codeError && <p className="field-error" role="alert">The guide access code is incorrect.</p>}
    <div className="field-label">Source language<div className="fixed-field">Korean (한국어) <span>Fixed</span></div></div>
    <label className="consent"><input type="checkbox" checked={guideConsent} onChange={(e) => setGuideConsent(e.target.checked)} /><span>I agree that my voice is converted to text and <strong>NOT stored.</strong></span></label>
    <p className="privacy-copy">Your speech is transcribed and translated in real time, then discarded. No audio recordings are kept; only subtitle text is shown to tourists during the session.</p>
    {notice && <p className="form-notice" role="alert">{notice}</p>}
    <div className="flow-buttons"><Button disabled={!guideConsent || !accessCode.trim() || busy} onClick={create}>{busy ? "Creating…" : "Create session"}</Button><button className="text-button" onClick={() => go("G-05")}>Back to dashboard</button></div></div>;
}
