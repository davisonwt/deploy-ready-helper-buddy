import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchSeedFileUrl } from '@/lib/media/getSeedFileUrl';
import {
  startPreviewPlayback,
  stopPreviewPlayback,
  subscribeToPreviewPlayback,
  getCurrentlyPlayingId,
} from '@/lib/media/previewPlaybackStore';

export interface UsePreviewPlayerOptions {
  /** Unique key for cross-component "only one plays at a time" coordination — e.g. the product/track id. */
  id: string;
  /** The public 45s clip. Playing this is always safe — seed-previews is a public bucket. */
  previewUrl: string | null;
  /** When present and the viewer is signed in, a click tries get-seed-file first (owner/buyer gets the full track); falls back to previewUrl on 403/failure. Omit for content with no full-track entitlement concept here (e.g. dj_music_tracks, already resolved elsewhere). */
  productId?: string | null;
  /** Client-side hard stop at this many seconds — for a source that might actually be a full file with no real preview object behind it (e.g. a dj_track falling back to file_url). Not needed when previewUrl already points at a genuinely-trimmed clip. */
  capSeconds?: number;
}

export interface UsePreviewPlayerResult {
  isPlaying: boolean;
  isLoading: boolean;
  /** 0–1 */
  progress: number;
  elapsedSeconds: number;
  durationSeconds: number;
  /** True once playback actually started on the full file rather than the preview clip. */
  isFullTrack: boolean;
  toggle: (e?: React.MouseEvent) => void;
  hasSource: boolean;
}

/**
 * Shared across every seed card and the detail page so "tap to hear 45
 * seconds, owners/buyers get the full track instead, only one plays at a
 * time" behaves identically everywhere. The visual player is
 * src/components/media/PreviewPlayer.tsx; this hook is the reusable state
 * machine underneath it for surfaces with their own bespoke layout (e.g.
 * MusicLibraryTable's row).
 */
export function usePreviewPlayer({ id, previewUrl, productId, capSeconds }: UsePreviewPlayerOptions): UsePreviewPlayerResult {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(() => getCurrentlyPlayingId() === id);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isFullTrack, setIsFullTrack] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    return subscribeToPreviewPlayback((playingId) => {
      if (playingId !== id) {
        setIsPlaying(false);
        setProgress(0);
        setElapsedSeconds(0);
      }
    });
  }, [id]);

  // Stop this card's audio (if it's the one playing) on unmount — a card
  // scrolled out of view shouldn't keep singing.
  useEffect(() => () => { stopPreviewPlayback(id); }, [id]);

  const toggle = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (isPlaying) {
      stopPreviewPlayback(id);
      setIsPlaying(false);
      setProgress(0);
      setElapsedSeconds(0);
      return;
    }

    const seq = ++requestSeq.current;
    (async () => {
      setIsLoading(true);
      let url = previewUrl;
      let full = false;

      if (user && productId) {
        const seedUrl = await fetchSeedFileUrl(productId, 'play');
        if (seq !== requestSeq.current) return; // a newer click (or toggle-off) superseded this one
        if (seedUrl) { url = seedUrl; full = true; }
      }

      if (seq !== requestSeq.current) return;
      setIsLoading(false);
      if (!url) return;

      setIsFullTrack(full);
      startPreviewPlayback(id, url, {
        onProgress: (fraction, currentTime, duration) => {
          if (seq !== requestSeq.current) return;
          if (capSeconds && currentTime >= capSeconds) {
            stopPreviewPlayback(id);
            setIsPlaying(false);
            setProgress(0);
            setElapsedSeconds(0);
            return;
          }
          setProgress(fraction);
          setElapsedSeconds(currentTime);
          setDurationSeconds(duration);
        },
        onEnded: () => { if (seq === requestSeq.current) { setIsPlaying(false); setProgress(0); setElapsedSeconds(0); } },
        onError: () => { if (seq === requestSeq.current) { setIsPlaying(false); setProgress(0); setElapsedSeconds(0); } },
      });
      setIsPlaying(true);
    })();
  }, [isPlaying, id, previewUrl, productId, user, capSeconds]);

  return {
    isPlaying,
    isLoading,
    progress,
    elapsedSeconds,
    durationSeconds,
    isFullTrack,
    toggle,
    hasSource: !!previewUrl || !!productId,
  };
}
