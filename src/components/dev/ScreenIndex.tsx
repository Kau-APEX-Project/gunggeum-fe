import { Icon } from "@/components/ui/Icon";
import { groups, mvp } from "@/data/screens";
import type { ScreenId } from "@/types";
import { useApp } from "@/context/AppContext";

// 디자인 검토용 패널, 실제 서비스 배포 전에 제거

export function ScreenIndex() {
  const { screen, indexOpen, setIndexOpen, setNoun, sessionLive, setSessionLive, statesOpen, setStatesOpen, go, jump, setLiveActive } = useApp();
  return <>
    <button className="screens-button" onClick={() => setIndexOpen(true)}>☰ Screens</button>
    {indexOpen && <div className="index-panel"><div className="index-head"><div><strong>Screen Index</strong><span>Design review · {groups.reduce((n, g) => n + g.screens.length, 0)} screens</span></div><button onClick={() => setIndexOpen(false)}><Icon name="close" /></button></div><div className="index-scroll">
      <section className="states-section"><button className="states-toggle" onClick={() => setStatesOpen(!statesOpen)}><span>States</span><small>{statesOpen ? "Hide" : "Show"} toggles ▾</small></button>
        {statesOpen && <div className="states-panel">
          {([["Offline", "S-01", "T-10"], ["Reconnecting", "S-02", "T-31"], ["Weak GPS", "S-03", "T-10"], ["Guide mic off", "S-04", "T-31"], ["Camera denied", "S-05", "T-20"]] as [string, ScreenId, ScreenId][]).map(([label, on, off]) => <button key={on} role="switch" aria-checked={screen === on} className={`switch-row ${screen === on ? "on" : ""}`} onClick={() => { if (screen === on) go(off, true); else { if (on === "S-02" || on === "S-04") setSessionLive(true); go(on, true); } }}><span>{label}<code>{on}</code></span><i /></button>)}
          <button role="switch" aria-checked={sessionLive} className={`switch-row ${sessionLive ? "on" : ""}`} onClick={() => setLiveActive(!sessionLive)}><span>Guide session active<code>live</code></span><i /></button>
        </div>}</section>
      {groups.map((group) => <section key={group.title}><h2>{group.title}</h2>{group.screens.map(([id, title]) => <button key={id} className={id === screen ? "current" : ""} onClick={() => jump(id)}><code>{id}</code><span>{title}</span>{mvp.has(id) && <em>MVP</em>}</button>)}</section>)}
      <section><h2>Components</h2><button onClick={() => { setNoun("Geunjeongjeon"); setIndexOpen(false); }}><code>UI</code><span>Proper Noun Card <small>reusable bottom sheet</small></span><em>MVP</em></button></section>
    </div></div>}
  </>;
}
