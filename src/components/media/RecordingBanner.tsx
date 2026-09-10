import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Square, X } from 'lucide-react';
import type { RecorderKind } from '@/hooks/useMediaRecorder';

// Shared across every screen that records a voice/video clip via
// useMediaRecorder (chat, 1-on-1 rooms). Owns the live camera preview and
// the on-device diagnostics line -- both grew out of iOS Safari bugs
// (preview not rendering, recordings silently coming back empty) that
// showed up independently on more than one screen because each screen
// used to hand-roll its own banner.
interface RecordingBannerProps {
  kind: RecorderKind | null;
  elapsed: number;
  stream: MediaStream | null;
  mimeType: string | null;
  error: string | null;
  onCancel: () => void;
  onStop: () => void;
}

export function RecordingBanner({ kind, elapsed, stream, mimeType, error, onCancel, onStop }: RecordingBannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // playsInline + muted are required for iOS Safari to render the stream
  // at all instead of trying to hand off to the native fullscreen player --
  // but Safari has also been observed to not reliably start playback of a
  // MediaStream srcObject assigned after mount from the `autoplay`
  // attribute alone; an explicit .play() call after assigning srcObject is
  // the standard fix. play() can reject (AbortError) if the stream/element
  // changes again before it resolves -- harmless, swallowed.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const videoStream = kind === 'video' ? stream : null;
    el.srcObject = videoStream;
    if (videoStream) el.play().catch(() => undefined);
  }, [stream, kind]);

  return (
    <div className="border-t border-[#FF8A5B]/30 bg-[#FF8A5B]/10 px-4 py-2 flex items-center gap-3">
      {kind === 'video' && (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-16 w-24 sm:h-24 sm:w-32 rounded-md bg-black object-cover shrink-0"
        />
      )}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-sm text-[#FF8A5B] tabular-nums">
          ● Recording {kind === 'audio' ? 'voice' : 'video'} — {elapsed}s
        </span>
        {/* On-device diagnostics -- there's no attached console on a phone,
            so this is the only way to see why a recording came back empty. */}
        <span className="text-[10px] leading-tight text-[#8AA99A]/70 font-mono">
          {mimeType ?? 'mimeType: n/a'}
          {kind === 'video' ? ` · video tracks: ${stream?.getVideoTracks().length ?? 0}` : ''}
          {error ? ` · error: ${error}` : ''}
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-[#7E9498] hover:text-[#FF8A5B] hover:bg-transparent">
          <X className="h-4 w-4" /> Cancel
        </Button>
        <Button size="sm" onClick={onStop} className="bg-[#FF8A5B]/20 hover:bg-[#FF8A5B]/30 text-[#FF8A5B] border border-[#FF8A5B]/40">
          <Square className="h-4 w-4 mr-1" /> Stop & send
        </Button>
      </div>
    </div>
  );
}
