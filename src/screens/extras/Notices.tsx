import { ScreenHeader } from "@/components/layout/ScreenHeader";

export function Notices() {
  const notes = [["Tour cancelled", "Today 14:00 English tour cancelled due to rain.", "12 min ago"], ["Weather", "Rain is expected after 13:00. Stone paths may be slippery.", "1 hour ago"], ["Event change", "The Changing of the Guard ceremony will move to Heungnyemun.", "Yesterday"]];
  return <div className="screen-pad"><ScreenHeader title="Notices" /><div className="notice-list">{notes.map((n) => <article key={n[0]}><span className="tag">{n[0]}</span><h2>{n[1]}</h2><time>{n[2]}</time></article>)}</div></div>;
}
