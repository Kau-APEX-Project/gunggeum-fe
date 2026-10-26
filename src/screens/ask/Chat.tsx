import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { Proper } from "@/components/ui/Proper";
import { won } from "@/lib/format";
import { ChatInput } from "@/screens/ask/ChatInput";
import { useApp } from "@/context/AppContext";

export function Chat({ noEvidence = false }: { noEvidence?: boolean }) {
  const { setNoun, chatQuestion, go } = useApp();
  return <div className="chat-screen"><ScreenHeader title="Ask GungGeum" /><div className="chat-body"><div className="user-bubble">{chatQuestion}</div><div className="bot-row"><span className="bot-icon">G</span><div className="bot-copy">
    {noEvidence ? <><p>I couldn't find this in official materials, so I won't guess.</p><p>You may find related information in this building guide:</p><button className="related-card" onClick={() => go("T-12")}><Photo label="Geunjeongjeon" /><span><strong>Geunjeongjeon</strong><small>Open building guide</small></span><Icon name="chevron" /></button></> :
    <><p><Proper onClick={() => setNoun("Gyeonghoeru")}>Gyeonghoeru</Proper> was built over a pond to create a dramatic setting for royal banquets and receptions. The water also reflects the pavilion and surrounding mountains, expressing harmony between architecture and nature.</p><div className="source-label">Sources</div><button className="source-chip" onClick={() => setNoun("Gyeonghoeru")}>▱ Gyeonghoeru – Korea Heritage Service</button></>}
  </div></div></div><ChatInput /></div>;
}
