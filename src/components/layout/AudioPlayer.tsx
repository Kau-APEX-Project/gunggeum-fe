import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/context/AppContext";
import { sampleTrack } from "@/data/audio";

const clock = (sec: number) => {
  if (!Number.isFinite(sec)) return "0:00";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
};

export function AudioPlayer() {
  const { audio, setAudio, audioPlaying, setAudioPlaying } = useApp();
  const ref = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);          // 현재 재생 위치
  const [duration, setDuration] = useState(0);  // 전체 길이

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (audioPlaying) {
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => setAudioPlaying(false)); // 브라우저가 막으면 정지 상태로 표시
    } else {
      el.pause();
    }
  }, [audioPlaying, audio, setAudioPlaying]);

  if (!audio) return null;

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !Number.isFinite(duration) || duration === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - box.left) / box.width) * duration;
  };

  const percent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  return <div className="audio-player">
    <audio
      ref={ref}
      src={sampleTrack.src}
      preload="metadata"
      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      onPlay={() => setAudioPlaying(true)}
      onPause={() => setAudioPlaying(false)}
      onError={() => setAudioPlaying(false)}
    />
    <button className="audio-play" onClick={() => setAudioPlaying(!audioPlaying)} aria-label={audioPlaying ? "Pause" : "Play"}>
      <Icon name={audioPlaying ? "pause" : "play"} size={15} />
    </button>
    <div className="audio-info">
      <strong>{sampleTrack.title}</strong>
      <div style={{ padding: "3px 0", cursor: "pointer" }} onClick={seek}>
        <div className="audio-track"><span style={{ width: `${percent}%` }} /></div>
      </div>
    </div>
    <span className="audio-time" style={{ whiteSpace: "nowrap" }}>{clock(time)} / {clock(duration)}</span>
    <button onClick={() => setAudio(false)} aria-label="Close player"><Icon name="close" size={16} /></button>
  </div>;
}
