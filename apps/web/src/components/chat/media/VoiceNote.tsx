import { useRef, useState } from 'react';
import type { AttachmentDTO } from '@voidlink/shared';
import { cn } from '../../../lib/cn';

const FALLBACK_BARS = Array.from({ length: 34 }, (_, index) =>
  0.22 + Math.abs(Math.sin(index * 1.7)) * 0.62,
);

function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function VoiceNote({ attachment }: { attachment: AttachmentDTO }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [durationMs, setDurationMs] = useState(attachment.durationMs ?? 0);

  const bars =
    attachment.waveform && attachment.waveform.length > 0
      ? attachment.waveform
      : FALLBACK_BARS;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  if (!attachment.url) return null;

  return (
    <div className="flex min-w-[210px] max-w-[300px] items-center gap-2 py-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:rgba(201,162,39,0.5)] bg-[color:rgba(201,162,39,0.14)] text-[color:var(--titan-gold-300)] transition-transform hover:scale-105"
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 5v14M16 5v14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
            <path d="M7 4.5 19 12 7 19.5Z" fill="currentColor" />
          </svg>
        )}
      </button>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Voice message position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onClick={seek}
        className="flex h-8 flex-1 cursor-pointer items-center gap-[2px] rounded-[2px] bg-black/20 px-1"
      >
        {bars.map((peak, index) => {
          const filled = index / bars.length <= progress;
          return (
            <span
              key={index}
              className={cn(
                'min-w-[2px] flex-1 rounded-full transition-colors',
                filled
                  ? 'bg-[color:var(--titan-gold-300)]'
                  : 'bg-[rgba(237,231,246,0.38)]',
              )}
              style={{ height: `${Math.max(14, Math.min(100, peak * 100))}%` }}
            />
          );
        })}
      </div>

      <span className="shrink-0 font-mono text-[0.6rem] text-bone/45">
        {clock(durationMs)}
      </span>

      <button
        type="button"
        onClick={cycleSpeed}
        aria-label={`Playback speed ${speed}x`}
        className="shrink-0 rounded-[2px] border border-[color:var(--hairline)] px-1 py-0.5 font-mono text-[0.55rem] text-bone/55"
      >
        {speed}x
      </button>

      <audio
        ref={audioRef}
        src={attachment.url}
        preload="metadata"
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setProgress(audio.currentTime / audio.duration);
            if (!durationMs) setDurationMs(audio.duration * 1000);
          }
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
    </div>
  );
}
