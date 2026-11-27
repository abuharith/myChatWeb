import { useCallback, useEffect, useRef, useState } from 'react';

export interface VoiceClip {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  waveform: number[];
}

function preferredMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

/**
 * Captures a voice note and samples real peaks from the microphone so the
 * waveform shown while recording is the waveform stored with the message.
 */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((clip: VoiceClip | null) => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const peaksRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);

  const teardown = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      peaksRef.current = [];
      setLevels([]);
      setElapsedMs(0);
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const durationMs = Math.round(Date.now() - startedAtRef.current);
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const peaks = peaksRef.current.length > 0 ? peaksRef.current : [0.2, 0.5, 0.3];
        const clip =
          blob.size > 0 ? { blob, mimeType: type, durationMs, waveform: peaks } : null;
        resolveRef.current?.(clip);
        resolveRef.current = null;
        teardown();
      };

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);

      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const centred = (sample - 128) / 128;
          sum += centred * centred;
        }
        const rms = Math.sqrt(sum / samples.length);
        peaksRef.current.push(Math.min(1, rms * 4));
        if (peaksRef.current.length > 96) peaksRef.current.shift();
        setLevels([...peaksRef.current]);
      }, 100);

      recorder.start(250);
      setRecording(true);
      return true;
    } catch {
      teardown();
      setError('Microphone unavailable — check the browser permission');
      return false;
    }
  }, [teardown]);

  const stop = useCallback((): Promise<VoiceClip | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    resolveRef.current?.(null);
    resolveRef.current = null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    teardown();
  }, [teardown]);

  return { recording, elapsedMs: Math.max(0, elapsedMs), levels, error, start, stop, cancel };
}
