import { useCallback, useRef, useState } from 'react';

export type RecorderKind = 'audio' | 'video';

export function useMediaRecorder() {
  const [recording, setRecording] = useState(false);
  const [kind, setKind] = useState<RecorderKind | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const resolveRef = useRef<((b: Blob | null) => void) | null>(null);

  const stopInternal = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async (k: RecorderKind, maxSeconds: number): Promise<Blob | null> => {
    if (recording) return null;
    const constraints: MediaStreamConstraints =
      k === 'audio' ? { audio: true } : { audio: true, video: { width: 640, height: 480 } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    chunksRef.current = [];
    const mime = k === 'audio' ? 'audio/webm' : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = rec;
    setKind(k);
    setElapsed(0);
    setRecording(true);

    return new Promise<Blob | null>(resolve => {
      resolveRef.current = resolve;
      rec.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: mime })
          : null;
        stopInternal();
        setRecording(false);
        setKind(null);
        setElapsed(0);
        resolveRef.current?.(blob);
        resolveRef.current = null;
      };
      rec.start();
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(s);
        if (s >= maxSeconds && rec.state === 'recording') rec.stop();
      }, 250);
    });
  }, [recording, stopInternal]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      chunksRef.current = [];
      recorderRef.current.stop();
    }
  }, []);

  return { recording, kind, elapsed, start, stop, cancel };
}
