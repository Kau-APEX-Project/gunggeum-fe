import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";

export function SessionEnded() {
  const { setNoun, go } = useApp();
  return <div className="screen-pad ended"><div className="line-illustration"><Icon name="check" size={46} /></div><h1>The tour has ended</h1><p>This live interpretation session has ended.</p><div className="session-stat"><span>Duration<strong>42 min</strong></span><span>Buildings<strong>4</strong></span></div><h3>Buildings mentioned</h3><div className="chips wrap">{["Geunjeongjeon", "Sajeongjeon", "Gyeonghoeru", "Gangnyeongjeon"].map((x) => <button key={x} onClick={() => setNoun(x)}>{x}</button>)}</div><div className="bottom-buttons"><Button onClick={() => go("T-30")}>Back to Live Tour</Button><Button secondary onClick={() => go("T-10")}>Back to Map</Button></div></div>;
}
