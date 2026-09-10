import { useCallback, useRef, useState } from 'react';

export type RecorderKind = 'audio' | 'video';

// iOS Safari's MediaRecorder does not support video/webm at all -- pick the
// first mimeType it (or any other browser) actually reports support for,
// rather than hardcoding one and having the MediaRecorder constructor throw
// on iOS. video/mp4 first since that's the one Safari supports; the webm
// variants cover every other browser exactly as before.
const VIDEO_MIME_CANDIDATES = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
const AUDIO_MIME_CANDIDATES = ['audio/webm', 'audio/mp4'];

function pickSupportedMime(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function useMediaRecorder() {
  const [recording, setRecording] = useState(false);
  const [kind, setKind] = useState<RecorderKind | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
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
    setStream(null);
  }, []);

  const start = useCallback(async (k: RecorderKind, maxSeconds: number): Promise<Blob | null> => {
    if (recording) return null;
    const constraints: MediaStreamConstraints =
      k === 'audio' ? { audio: true } : { audio: true, video: { width: 640, height: 480 } };
    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = mediaStream;

    // isTypeSupported returning false for every candidate (extremely old
    // browser) is treated the same as a getUserMedia failure -- never enter
    // the recording state, and release the camera/mic we just acquired.
    const mime = pickSupportedMime(k === 'audio' ? AUDIO_MIME_CANDIDATES : VIDEO_MIME_CANDIDATES);
    if (!mime) {
      mediaStream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      throw new Error(`This browser can't record ${k === 'audio' ? 'audio' : 'video'} messages.`);
    }

    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(mediaStream, { mimeType: mime });
    } catch (err) {
      // Belt-and-braces: isTypeSupported said yes but construction still
      // threw. Release the stream before rethrowing so the camera/mic
      // indicator doesn't stay lit on a recording that never started.
      mediaStream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      throw err;
    }

    chunksRef.current = [];
    recorderRef.current = rec;
    setKind(k);
    setElapsed(0);
    setStream(mediaStream);
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

  return { recording, kind, elapsed, stream, start, stop, cancel };
}
