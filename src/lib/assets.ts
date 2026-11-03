// 지도·전각 데이터가 있는 곳의 기준 주소
// 주소가 생기면 코드를 고치지 않고 .env 파일의 VITE_ASSET_BASE 한 줄을 채운다
const base = String(import.meta.env.VITE_ASSET_BASE ?? "").trim().replace(/\/+$/, "");

// assetUrl("servermap/style.json") → "https://기준주소/servermap/style.json"
export const assetUrl = (path: string) => `${base}/${path.replace(/^\/+/, "")}`;
