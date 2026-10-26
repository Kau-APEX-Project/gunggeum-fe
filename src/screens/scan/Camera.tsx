import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { buildings } from "@/data/buildings";
import { useApp } from "@/context/AppContext";

export function Camera({ result }: { result?: "high" | "low" }) {
  const { confidence, setConfidence, setChatQuestion, go } = useApp();
  return <div className="camera-screen"><div className="camera-top"><button onClick={() => go("T-10")}><Icon name="close" /></button><span><Icon name="compass" size={16} /> NW 326°</span><i /></div>
    <div className="viewfinder"><span /><span /><span /><span /><p>Point your camera at a building</p></div>
    {!result && <><label className="confidence-toggle">Simulation: <button onClick={() => setConfidence(confidence === "high" ? "low" : "high")}>{confidence === "high" ? "High match" : "Low match"}</button></label><button className="shutter" onClick={() => go(confidence === "high" ? "T-21" : "T-22")}><span /></button></>}
    {result === "high" && <div className="scan-sheet"><div className="sheet-handle" /><div className="match-row"><Photo label="Geunjeongjeon" /><div><span className="match">High match</span><h2>This is<br />Geunjeongjeon</h2></div></div><div className="two-buttons"><Button onClick={() => go("T-12")}><Icon name="play" /> Play guide</Button><Button secondary onClick={() => { setChatQuestion("Tell me about Geunjeongjeon"); go("T-41"); }}>Ask a question</Button></div></div>}
    {result === "low" && <div className="scan-sheet low"><div className="sheet-handle" /><h2>Which one are you looking at?</h2><p>We found a few possible matches.</p><div className="candidate-row">{["Geunjeongjeon", "Sajeongjeon", "Heungnyemun"].map((b) => <button key={b} onClick={() => go("T-12")}><Photo label={b} /><strong>{b}</strong><small>{buildings.find((x) => x[0] === b)?.[3]}</small></button>)}</div></div>}
  </div>;
}
