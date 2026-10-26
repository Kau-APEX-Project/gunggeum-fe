// 임시 오디오 트랙입니다. 실제 오디오 파일이 오면 건물별로 늘려 갑니다.
// 예) { "Geunjeongjeon": { title: "Geunjeongjeon", src: "https://.../geunjeongjeon.mp3" }, ... }
export const sampleTrack = {
  title: "Geunjeongjeon",
  src: `${import.meta.env.BASE_URL}audio/sample.mp3`,
};
