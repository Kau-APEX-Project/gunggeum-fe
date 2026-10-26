import { Button } from "@/components/ui/Button";
import { GuideBrand } from "@/screens/guide/GuideBrand";
import { useApp } from "@/context/AppContext";

export function GuideLogin() {
  const { setGuideAuthed, go, notify } = useApp();
  return <div className="guide-screen compact screen-pad"><GuideBrand /><h1>Guide login</h1>
    <label className="field-label">Email / Guide ID<input placeholder="guide@palace.kr or GID-0000" autoComplete="off" /></label>
    <label className="field-label">Password<input type="password" placeholder="••••••••" /></label>
    <Button onClick={() => { setGuideAuthed(true); go("G-05"); }}>Log in</Button>
    <div className="center-row"><button className="link-small" onClick={() => notify("Password reset link sent to your registered guide email (simulated).")}>Forgot password?</button></div>
    <div className="guide-notice">Guide Mode is for authorized palace guides and interpreters only.</div>
    <div className="center-row"><button className="text-button" onClick={() => { setGuideAuthed(false); go("T-00"); }}>Back to tourist mode</button></div>
  </div>;
}
