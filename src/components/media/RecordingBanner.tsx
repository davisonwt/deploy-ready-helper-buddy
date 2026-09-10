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

  // On-device diagnostics -- there's no attached console on a phone, so
  // this is the only way to see why a recording came back empty. Kept
  // tiny and low-opacity by design in both layouts.
  const diagnostics = (
    <span className="text-[10px] leading-tight text-[#8AA99A]/70 font-mono">
      {mimeType ?? 'mimeType: n/a'}
      {kind === 'video' ? ` · video tracks: ${stream?.getVideoTracks().length ?? 0}` : ''}
      {error ? ` · error: ${error}` : ''}
    </span>
  );

  if (kind === 'video') {
    // Full-screen capture UX. z-[60] is deliberate: WalletBalanceChip and
    // every Radix dialog/overlay in this app use z-50, so z-50 here would
    // leave stacking between this and the wallet chip up to DOM order --
    // z-[60] puts this unambiguously above both, while staying below the
    // toast viewport (z-[100]) so a send-failure toast is still visible
    // on top of it once recording ends.
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="flex justify-center pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-1.5 text-sm text-white tabular-nums backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#FF8A5B] animate-pulse" />
            {elapsed}s
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 px-6 pb-6">
          <Button
            size="lg"
            variant="ghost"
            onClick={onCancel}
            aria-label="Cancel recording"
            className="gap-2 rounded-full bg-black/50 px-5 py-3 text-base text-white backdrop-blur hover:bg-black/70 hover:text-white"
          >
            <X className="h-5 w-5" /> Cancel
          </Button>
          <Button
            size="lg"
            onClick={onStop}
            aria-label="Stop recording and send"
            className="gap-2 rounded-full bg-[#FF8A5B] px-6 py-3 text-base text-black hover:bg-[#FF8A5B]/90"
          >
            <Square className="h-5 w-5" /> Stop & send
          </Button>
        </div>

        <div className="flex justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {diagnostics}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#FF8A5B]/30 bg-[#FF8A5B]/10 px-4 py-2 flex items-center gap-3">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-sm text-[#FF8A5B] tabular-nums">
          ● Recording voice — {elapsed}s
        </span>
        {diagnostics}
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
