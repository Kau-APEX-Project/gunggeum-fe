import { ApiError, type AskResponse, type CardResponse, type SessionCreateBody, type SessionCreated, type SessionSummary } from "@/lib/apiTypes";
import type { Lang } from "@/lib/language";

// 가짜 서버. VITE_API_BASE 가 비어 있을 때만 사용되며 응답 모양은 API 명세서의 예시와 같다
// 내용은 화면 동작을 눌러 보기 위한 임시 문장(실제 답변이 아님).
//
// 시험용 입력: 질문에 #429 > 요청 과다(S-06), #500 > 서버 오류, #504 > 시간 초과
//             가이드 접근 코드에 wrong > 403 (코드가 틀림)

export const mockDelay = { ask: 1200, card: 300, session: 500 };
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function ask(question: string, language: Lang): Promise<AskResponse> {
  await wait(mockDelay.ask);
  const q = question.trim();
  if (q === "#429") throw new ApiError("rate_limit", 429, "too many requests");
  if (q === "#500") throw new ApiError("server", 500, "mock server error");
  if (q === "#504") throw new ApiError("timeout", 504, "mock timeout");
  if (q.length < 1 || q.length > 300) throw new ApiError("bad_request", 400, "question");
  const lower = q.toLowerCase();
  const lang = language;

  // 근처 편의시설
  if (/toilet|restroom|bench|drinking water|water fountain|화장실|벤치|식수대/.test(lower)) {
    const category = /bench|벤치/.test(lower) ? "bench" : /water|식수대/.test(lower) ? "water" : "restroom";
    const text = category === "restroom"
      ? (lang === "th" ? "กำลังแสดงห้องน้ำที่ใกล้ที่สุดบนแผนที่" : "Showing the nearest restrooms on the map.")
      : category === "bench" ? "Showing the nearest benches on the map." : "Showing the nearest water fountains on the map.";
    return { answer: text, language: lang, action: { type: "amenity", category } };
  }
  // 길 묻기
  if (/get to|how do i get|where is|directions|어떻게 가|가는 길/.test(lower)) {
    return {
      answer: "[Gyotaejeon (Queen's Quarters)](card:b-164) was the queen's residence. Behind it you can see the decorated chimneys of Amisan.",
      language: lang,
      action: { type: "route", to: "place:gyotaejeon" },
    };
  }
  // 일반 질문 (근거 있음)
  if (/gyeonghoeru|경회루/.test(lower)) {
    return { answer: "[Gyeonghoeru (Royal Banquet Hall)](card:b-173) was built over a pond to create a dramatic setting for royal banquets and receptions. The water also reflects the pavilion and surrounding mountains, expressing harmony between architecture and nature.", language: lang, action: null };
  }
  if (/king sleep|sleep|침전/.test(lower)) {
    return { answer: "[Gangnyeongjeon (King's Quarters)](card:b-163) was the king's private living and sleeping quarters inside the palace.", language: lang, action: null };
  }
  if (/painting behind|irworobongdo|일월오봉/.test(lower)) {
    return { answer: "The painting behind the throne is [Irworobongdo (Sun, Moon and Five Peaks)](card:t-50), a royal screen that stands behind the throne in [Geunjeongjeon (Throne Hall)](card:b-160).", language: lang, action: null };
  }
  // 근거 없음 (링크 없이 정해진 문장)
  return {
    answer: lang === "th" ? "เอกสารไม่มีข้อมูลเกี่ยวกับคำถามนี้" : "The documents I have do not cover this question, so I can't answer it.",
    language: lang,
    action: null,
  };
}

const CARDS: Record<string, CardResponse> = {
  "b-160": { id: "b-160", type: "building", name: "근정전", name_en: "Geunjeongjeon (Throne Hall)", name_th: "คึนจองจอน (ท้องพระโรง)",
    text: "근정전은 경복궁의 정전으로, 국가의 중요한 의식이 거행되던 공간이다.", text_en: "Geunjeongjeon is the main hall of Gyeongbokgung, where important state ceremonies were held. It stands on a two-tiered stone platform.\n\nThe hall was destroyed during the Japanese invasion and rebuilt in 1867 during the reconstruction of the palace.", text_th: null,
    category: null, photo: "/photos/160.jpg", photo_license: "AI Hub terms of use", photo_source: "AI Hub dataset" },
  "b-163": { id: "b-163", type: "building", name: "강녕전", name_en: "Gangnyeongjeon (King's Quarters)", name_th: null,
    text: "강녕전은 왕이 일상을 보내던 침전이다.", text_en: "Gangnyeongjeon was the king's private living and sleeping quarters.", text_th: null,
    category: null, photo: null, photo_license: null, photo_source: null },
  "b-164": { id: "b-164", type: "building", name: "교태전", name_en: "Gyotaejeon (Queen's Quarters)", name_th: null,
    text: "교태전은 왕비의 침전이다.", text_en: "Gyotaejeon was the queen's residence. A decorated garden with chimneys lies behind it.", text_th: null,
    category: null, photo: null, photo_license: null, photo_source: null },
  "b-173": { id: "b-173", type: "building", name: "경회루", name_en: "Gyeonghoeru (Royal Banquet Hall)", name_th: null,
    text: "경회루는 연못 위에 지은 누각으로 연회를 열던 곳이다.", text_en: "Gyeonghoeru is a grand pavilion on a pond, used for royal banquets.", text_th: null,
    category: null, photo: null, photo_license: null, photo_source: null },
  "t-50": { id: "t-50", type: "term", name: "일월오봉도", name_en: "Irworobongdo (Sun, Moon and Five Peaks)", name_th: null,
    text: "일월오봉도는 어좌 뒤에 두던 그림이다.", text_en: "Irworobongdo is a royal screen showing the sun, moon and five peaks, placed behind the throne.", text_th: null,
    category: "Artifact", photo: null, photo_license: null, photo_source: null },
};

export async function card(id: string): Promise<CardResponse> {
  await wait(mockDelay.card);
  const found = CARDS[id];
  if (!found) throw new ApiError("not_found", 404, "no card");
  return found;
}

let startedAt = 0;
export async function createSession(body: SessionCreateBody): Promise<SessionCreated> {
  await wait(mockDelay.session);
  if (body.consent !== true) throw new ApiError("bad_request", 400, "consent");
  if ((body.accessCode ?? "") === "wrong") throw new ApiError("forbidden", 403, "wrong access code");
  const code = `GB-${Math.floor(1000 + Math.random() * 9000)}`;
  startedAt = Date.now();
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8443";
  return { code, joinUrl: `${origin}/live/${code}`, guideToken: "mock-guide-token", sourceLang: "ko", startedAt: new Date(startedAt).toISOString() };
}

export async function endSession(code: string): Promise<SessionSummary> {
  await wait(mockDelay.session);
  const elapsed = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 1122;
  return { code, durationSec: elapsed, peakParticipants: 23, languages: { en: 15, th: 8 }, mentionedCards: ["b-160"] };
}
