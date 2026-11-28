import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { formatWhen, typeLabel, useNotices } from "@/lib/notices";

// T-50 공지 목록. 서버의 최신순 공지(최대 20건)를 유형 태그, 시각, 제목, 본문으로 표시하고, 출처 링크(sourceUrl)가 있으면 "View original" 을 보여 줌
export function Notices() {
  const { status, notices, reload } = useNotices();
  const empty = notices.length === 0;
  return <div className="screen-pad"><ScreenHeader title="Notices" />
    {empty && status !== "error" && status !== "ready" && <p role="status">Loading…</p>}
    {empty && status === "ready" && <p>No notices right now.</p>}
    {empty && status === "error" && <div role="alert"><p>We couldn't load the notices.</p><button className="ask-btn" onClick={reload}>Try again</button></div>}
    <div className="notice-list">{notices.map((n) => <article key={n.id}>
      <span className="tag">{typeLabel(n.type)}</span>
      <h2>{n.title}</h2>
      {n.body && <p style={{ fontSize: 12, lineHeight: 1.5, margin: "0 0 8px" }}>{n.body}</p>}
      {n.publishedAt !== null && <time>{formatWhen(n.publishedAt)}</time>}
      {n.sourceUrl && <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 6, fontSize: 12, textDecoration: "underline", color: "inherit" }}>View original</a>}
    </article>)}</div>
  </div>;
}
