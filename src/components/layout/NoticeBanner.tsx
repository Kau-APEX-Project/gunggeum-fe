import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { useNotices } from "@/lib/notices";

// T-10 지도 위 공지 배너. 최신 공지 1건의 제목을 보여 주고 누르면 T-50 으로 이동함. 공지가 없으면 표시하지 않음
export function NoticeBanner() {
  const { go } = useApp();
  const { notices } = useNotices();
  const latest = notices[0];
  if (!latest) return null;
  return <button className="notice-banner" onClick={() => go("T-50")}><span>NOTICE</span>{latest.title}<Icon name="chevron" size={15} /></button>;
}
