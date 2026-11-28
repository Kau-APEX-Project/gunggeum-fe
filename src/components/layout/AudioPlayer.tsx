import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { useAudioTrack } from "@/lib/audioStore";
import { lineAt, useLyrics, type LyricLine } from "@/lib/lyrics";
import "@/styles/lyrics.css";

const clock = (sec: number) => {
  if (!Number.isFinite(sec)) return "0:00";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
};

export function AudioPlayer() {
  const { audio, setAudio, audioPlaying, setAudioPlaying, screen } = useApp();
  const ref = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);          // 현재 재생 위치
  const [duration, setDuration] = useState(0);  // 전체 길이
  const track = useAudioTrack();                // 지금 재생할 건물의 음성
  const [failed, setFailed] = useState(false);   // 이 건물의 음성 파일을 못 불러옴
  useEffect(() => { setFailed(false); setTime(0); setDuration(0); }, [track.src]);

  // 가사: 문장별 시간 파일이 있는 건물만 가사 화면을 열 수 있음
  const lines = useLyrics(track.lyricsSrc);
  const usable = lines && !failed ? lines : null;
  const active = usable ? lineAt(usable, time) : -1; // 지금 읽는 문장 (없으면 -1)
  const [open, setOpen] = useState(false);
  const showing = open && !!usable;
  const scroller = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const manualUntil = useRef(0);    // 사용자가 직접 스크롤한 직후에는 잠깐 자동 스크롤을 멈춤
  const justOpened = useRef(false); // 처음 열 때는 애니메이션 없이 바로 현재 문장으로

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (audioPlaying) {
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => setAudioPlaying(false)); // 브라우저가 막으면 정지 상태로 표시
    } else {
      el.pause();
    }
  }, [audioPlaying, audio, track.src, setAudioPlaying]);

  // 화면을 옮기거나 플레이어를 닫으면 가사 화면도 닫음
  useEffect(() => { setOpen(false); }, [screen, audio]);

  useEffect(() => {
    if (!showing) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showing]);

  // 지금 읽는 문장이 바뀌면 그 문장이 가운데 오도록 스크롤
  useEffect(() => {
    if (!showing) return;
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!box || !el) return;
    const first = justOpened.current;
    justOpened.current = false;
    if (!first && Date.now() < manualUntil.current) return;
    const calm = first || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2, behavior: calm ? "auto" : "smooth" });
  }, [showing, active]);

  if (!audio) return null;

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !Number.isFinite(duration) || duration === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - box.left) / box.width) * duration;
  };

  const openLyrics = () => { justOpened.current = true; manualUntil.current = 0; setOpen(true); };
  const jump = (line: LyricLine) => { // 문장을 누르면 그 문장 처음으로 옮겨서 재생
    const el = ref.current;
    if (!el) return;
    el.currentTime = line.start;
    setTime(line.start);
    manualUntil.current = 0;
    if (!audioPlaying) setAudioPlaying(true);
  };
  const pauseAutoScroll = () => { manualUntil.current = Date.now() + 3000; };

  const percent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  return <>
    {showing && usable && <section className="lyrics" role="dialog" aria-label={`${track.title} transcript`}>
      <div className="lyrics-head">
        <strong>{track.title}</strong>
        <button ref={closeBtn} onClick={() => setOpen(false)} aria-label="Close transcript"><Icon name="close" size={20} /></button>
      </div>
      <div className="lyrics-scroll" ref={scroller} onWheel={pauseAutoScroll} onTouchMove={pauseAutoScroll}>
        <ul>
          {usable.map((line, n) => <li key={n}>
            <button className="lyrics-line" aria-current={n === active ? "true" : undefined} onClick={() => jump(line)}>{line.text}</button>
          </li>)}
        </ul>
      </div>
    </section>}
    <div className={`audio-player${usable ? " has-lyrics" : ""}`}>
      <audio
        ref={ref}
        src={track.src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setAudioPlaying(true)}
        onPause={() => setAudioPlaying(false)}
        onError={() => { setFailed(true); setAudioPlaying(false); }}
      />
      <button className="audio-play" onClick={() => setAudioPlaying(!audioPlaying)} aria-label={audioPlaying ? "Pause" : "Play"}>
        <Icon name={audioPlaying ? "pause" : "play"} size={15} />
      </button>
      <div className="audio-info">
        {usable
          ? <button className="audio-open" onClick={openLyrics} aria-haspopup="dialog" aria-label={`${track.title}. Show transcript`}>
              <strong>{track.title}</strong>
              {active >= 0 && <small>{usable[active].text}</small>}
            </button>
          : <strong>{track.title}</strong>}
        {failed ? <small role="alert">Audio is not available for this building yet.</small> : <div style={{ padding: "3px 0", cursor: "pointer" }} onClick={seek}>
          <div className="audio-track"><span style={{ width: `${percent}%` }} /></div>
        </div>}
      </div>
      <span className="audio-time" style={{ whiteSpace: "nowrap" }}>{clock(time)} / {clock(duration)}</span>
      <button onClick={() => setAudio(false)} aria-label="Close player"><Icon name="close" size={16} /></button>
    </div>
  </>;
}
