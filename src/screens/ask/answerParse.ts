// 서버 답변은 일반 문단 글이고 건물·용어 이름은 [이름](card:b-160) 형태의 링크입니다
// 글자와 카드 링크로 나눠서 화면이 안전하게 그리도록 함(HTML 로 해석하지 않음)
export type AnswerPart = { kind: "text"; text: string } | { kind: "card"; label: string; id: string };

const LINK = /\[([^\]]+)\]\(card:([bt]-\d+)\)/g;

export function splitParagraph(p: string): AnswerPart[] {
  const parts: AnswerPart[] = [];
  let last = 0;
  for (const m of p.matchAll(LINK)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ kind: "text", text: p.slice(last, at) });
    parts.push({ kind: "card", label: m[1], id: m[2] });
    last = at + m[0].length;
  }
  if (last < p.length) parts.push({ kind: "text", text: p.slice(last) });
  return parts;
}

export const splitAnswer = (text: string): AnswerPart[][] =>
  text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map(splitParagraph);
