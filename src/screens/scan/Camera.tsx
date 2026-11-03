import { useEffect, useRef, useState, type ChangeEvent } from "react";
import "@/styles/camera.css";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { useApp } from "@/context/AppContext";
import { typeLabel, usePlaces, type Place } from "@/data/places";
import { LOW_SCORE_WARNING, SINGLE_RESULT_MIN } from "@/lib/cameraConfig";
import {
  cameraErrorText,
  chooseCandidate,
  enterCamera,
  isSetupError,
  leaveCamera,
  resetScan,
  setOpenBuildingHandler,
  submitPhoto,
  useCameraState,
} from "@/lib/cameraStore";
import type { CameraCandidate } from "@/camera/connect-example.mjs";

const percent = (score: number) => `${Math.round(score * 100)}%`;

// 후보(한글명·카드 번호)에 해당하는 우리 장소 데이터를 찾아 영어 이름과 유형을 붙인다
function describe(c: CameraCandidate, places: Place[]) {
  const serial = c.card_id ? Number(c.card_id.replace(/^b-/, "")) : NaN;
  const place = places.find((p) => p.serial === serial);
  return { name: place?.en ?? c.name_ko, ko: c.name_ko, type: place ? typeLabel(place.category) : "" };
}

// T-20 촬영, T-21 결과 1개(92% 이상), T-22 후보 3개 — 세 화면이 같은 컴포넌트를 사용함
// (화면이 서로 바뀌어도 이 컴포넌트는 유지되고, T-20~T-22 를 완전히 나갈 때만 정리된다)
export function Camera({ result }: { result?: "high" | "low" }) {
  const { go, goToPlace, ask } = useApp();
  const { places } = usePlaces();
  const cam = useCameraState();
  const [noMatch, setNoMatch] = useState(false); // "맞는 게 없어요" 안내를 펼친 상태

  const pick = useRef(goToPlace);
  pick.current = goToPlace;
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  // 카메라 화면에 들어오면 인식기를 준비하고, 나가면 정리한다
  useEffect(() => {
    setOpenBuildingHandler(({ poiId }) => pick.current(poiId)); // 후보를 누르면 건물 상세로
    enterCamera();
    return () => {
      setOpenBuildingHandler(null);
      leaveCamera();
    };
  }, []);

  // 새 결과가 오면 T-20 > T-21(92% 이상) 또는 T-22 로 이동
  const top = cam.candidates[0];
  useEffect(() => {
    setNoMatch(false);
    if (!result && top) go(top.score >= SINGLE_RESULT_MIN ? "T-21" : "T-22");
  }, [cam.candidates]);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 사진을 다시 골라도 동작하도록
    if (file) submitPhoto(file);
  };
  const retake = () => {
    resetScan();
    setNoMatch(false);
    go("T-20");
  };

  const photoBg = cam.photoUrl ? <><img className="cam-photo" src={cam.photoUrl} alt="" /><div className="cam-dim" /></> : null;
  const topBar = <div className="camera-top"><button onClick={() => go("T-10")} aria-label="Close"><Icon name="close" /></button><i /></div>;

  // ---------- T-20: 촬영 ----------
  if (!result) {
    const preparing = cam.phase === "preparing";
    const status = cam.errorCode
      ? cameraErrorText(cam.errorCode)
      : cam.busy
        ? preparing ? "Setting up for the first time. This can take a few seconds." : "Recognizing your photo…"
        : preparing ? "Getting ready…" : "Take a clear photo of one building.";
    return <div className="camera-screen cam-live">
      {photoBg}{topBar}
      <div className="viewfinder"><span /><span /><span /><span /><p>Take a photo of a palace building</p></div>
      <p className="cam-status" role="status">{status}</p>
      {cam.errorCode && isSetupError(cam.errorCode) && <button className="cam-retry" onClick={() => enterCamera()}>Try again</button>}
      <button className="cam-gallery" disabled={cam.busy} onClick={() => galleryInput.current?.click()}>Choose from gallery</button>
      <button className="shutter" disabled={cam.busy} onClick={() => cameraInput.current?.click()} aria-label="Take photo"><span /></button>
      <input ref={cameraInput} className="cam-input" type="file" accept="image/*" capture="environment" onChange={onFile} tabIndex={-1} />
      <input ref={galleryInput} className="cam-input" type="file" accept="image/*" onChange={onFile} tabIndex={-1} />
    </div>;
  }

  // ---------- 결과 화면인데 결과가 없을 때 (시안 목록에서 바로 열었거나 상세에서 뒤로 왔을 때) ----------
  if (!top) {
    return <div className="camera-screen cam-live">
      {topBar}
      <div className="scan-sheet low"><div className="sheet-handle" />
        <h2 className="cam-h">No photo yet</h2>
        <p className="cam-sub">Take a photo of a palace building to identify it.</p>
        <div className="two-buttons"><Button onClick={() => go("T-20")}><Icon name="camera" /> Take a photo</Button><Button secondary onClick={() => go("T-11")}>Search the building list</Button></div>
      </div>
    </div>;
  }

  // "맞는 게 없어요": 다시 찍기 또는 전각 목록으로
  const noMatchPanel = <>
    <h2 className="cam-h">Not what you were looking for?</h2>
    <p className="cam-sub">We can identify 60 palace buildings. Try a clearer photo from the front, or find it in the list.</p>
    <div className="two-buttons"><Button onClick={retake}><Icon name="camera" /> Retake photo</Button><Button secondary onClick={() => go("T-11")}>Search the building list</Button></div>
    <button className="text-button cam-link" onClick={() => setNoMatch(false)}>Back to results</button>
  </>;
  const topInfo = describe(top, places);
  const errorLine = cam.errorCode ? <p className="cam-warning" role="alert">{cameraErrorText(cam.errorCode)}</p> : null;

  // ---------- T-21: 1순위 점수가 92% 이상 → 1개만 ----------
  if (result === "high") {
    return <div className="camera-screen cam-live">
      {photoBg}{topBar}
      <div className="scan-sheet"><div className="sheet-handle" />
        {noMatch ? noMatchPanel : <>
          <div className="match-row"><Photo label={topInfo.name} /><div><span className="match">Best match · {percent(top.score)}</span><h2>This is<br />{topInfo.name}</h2></div></div>
          <p className="cam-note">Score from the recognition model, not a guarantee.</p>
          {errorLine}
          <div className="two-buttons">
            <Button onClick={() => chooseCandidate(top)}><Icon name="play" /> Play guide</Button>
            <Button secondary onClick={() => { ask(`Tell me about ${topInfo.name}`); }}>Ask a question</Button>
          </div>
          <button className="text-button cam-link" onClick={() => setNoMatch(true)}>Not this building?</button>
        </>}
      </div>
    </div>;
  }

  // ---------- T-22: 1순위 크게 + 나머지 2개 작게 (기준치% 미만이면 경고) ----------
  const lowScore = top.score < LOW_SCORE_WARNING;
  const others = cam.candidates.slice(1);
  return <div className="camera-screen cam-live">
    {photoBg}{topBar}
    <div className="scan-sheet low"><div className="sheet-handle" />
      {noMatch ? noMatchPanel : <>
        <h2 className="cam-h">Which one are you looking at?</h2>
        {lowScore
          ? <p className="cam-warning" role="alert">{"We're not sure this is a palace building. Try another photo, or pick from the list."}</p>
          : <p className="cam-sub">We found a few possible matches.</p>}
        {errorLine}
        <button className="cam-top-card" onClick={() => chooseCandidate(top)}>
          <Photo label={topInfo.name} />
          <span className="cam-card-text"><strong>{topInfo.name}</strong><small>{topInfo.ko}{topInfo.type ? ` · ${topInfo.type}` : ""}</small></span>
          <b className="cam-score">{percent(top.score)}</b>
        </button>
        <div className="cam-small-row">
          {others.map((c) => {
            const info = describe(c, places);
            return <button key={c.class_index} className="cam-small" onClick={() => chooseCandidate(c)}><strong>{info.name}</strong><small>{info.ko} · {percent(c.score)}</small></button>;
          })}
        </div>
        <p className="cam-note">Scores come from the recognition model, not a guarantee.</p>
        <button className="text-button cam-link" onClick={() => setNoMatch(true)}>None of these</button>
      </>}
    </div>
  </div>;
}
