import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pause, Play, X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  startPreviewPlayback, stopPreviewPlayback, subscribeToPreviewPlayback, getCurrentlyPlayingId,
} from '@/lib/media/previewPlaybackStore';

export interface AlbumTrack {
  index: number;
  number: number;
  title: string;
  durationSeconds: number | null;
  single: { productId: string; price: number } | null;
  full: boolean;
}

const PREVIEW_SECONDS = 45;

async function callAlbumTracks<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('album-tracks', { body });
  if (error) {
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try { const parsed = await ctx.json(); message = parsed?.message || parsed?.error || message; } catch { /* keep */ }
    }
    throw new Error(message);
  }
  return data as T;
}

/** "Album · N tracks" for the card label; null until known. */
export function useAlbumTrackCount(albumId: string, enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    callAlbumTracks<{ album: { trackCount: number } }>({ albumId, action: 'summary' })
      .then((r) => { if (alive) setCount(r.album.trackCount); })
      .catch(() => { /* the label falls back to "Album" */ });
    return () => { alive = false; };
  }, [albumId, enabled]);
  return count;
}

function fmt(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '';
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Props {
  albumId: string;
  albumTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The play control the list hangs off (desktop anchors the drop-down to it). */
  children: ReactNode;
  /** A row's own Bestow, offered only when that track is also sold as a single. */
  onBestowTrack?: (track: AlbumTrack) => void;
}

/**
 * An album card's track list: a drop-down on desktop, a bottom sheet on
 * phones. Each row plays through album-tracks -- its 45s preview, or the
 * full track for the owner / an album buyer / that track's buyer. One track
 * at a time (the shared preview store stops the previous one); closing the
 * list stops playback.
 */
export default function AlbumTracksPanel({ albumId, albumTitle, open, onOpenChange, children, onBestowTrack }: Props) {
  const isMobile = useIsMobile();
  const [tracks, setTracks] = useState<AlbumTrack[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [rowError, setRowError] = useState<Record<number, string>>({});
  const seq = useRef(0);
  const idFor = (i: number) => `album:${albumId}:${i}`;

  useEffect(() => {
    if (!open || tracks) return;
    let alive = true;
    setError(null);
    callAlbumTracks<{ tracks: AlbumTrack[] }>({ albumId, action: 'list' })
      .then((r) => { if (alive) setTracks(r.tracks); })
      .catch((e) => { if (alive) setError(e.message || 'Could not load the tracks.'); });
    return () => { alive = false; };
  }, [open, albumId, tracks]);

  // Another player (another card, another album) took over.
  useEffect(() => subscribeToPreviewPlayback((id) => {
    if (playing !== null && id !== idFor(playing)) { setPlaying(null); setProgress(0); setElapsed(0); }
  }), [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopOurs = () => {
    const current = getCurrentlyPlayingId();
    if (current && current.startsWith(`album:${albumId}:`)) stopPreviewPlayback(current);
    seq.current++;
    setPlaying(null); setLoadingIdx(null); setProgress(0); setElapsed(0);
  };

  // Closing the list stops playback; so does the card going away.
  useEffect(() => { if (!open) stopOurs(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopOurs(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (t: AlbumTrack) => {
    if (playing === t.index) { stopOurs(); return; }
    const mine = ++seq.current;
    setLoadingIdx(t.index);
    setRowError((prev) => ({ ...prev, [t.index]: '' }));
    try {
      const r = await callAlbumTracks<{ url: string; full: boolean }>({ albumId, action: 'play', index: t.index });
      if (mine !== seq.current) return;
      setLoadingIdx(null);
      setPlaying(t.index); setProgress(0); setElapsed(0);
      startPreviewPlayback(idFor(t.index), r.url, {
        onProgress: (fraction, currentTime) => {
          if (mine !== seq.current) return;
          // Belt and braces: the preview object is already a 45s clip.
          if (!r.full && currentTime >= PREVIEW_SECONDS) { stopOurs(); return; }
          setProgress(r.full ? fraction : Math.min(1, currentTime / PREVIEW_SECONDS));
          setElapsed(currentTime);
        },
        onEnded: () => { if (mine === seq.current) { setPlaying(null); setProgress(0); setElapsed(0); } },
        onError: () => {
          if (mine !== seq.current) return;
          setPlaying(null);
          setRowError((prev) => ({ ...prev, [t.index]: "This track didn't play. Try again." }));
        },
      });
    } catch (e) {
      if (mine !== seq.current) return;
      setLoadingIdx(null);
      setRowError((prev) => ({ ...prev, [t.index]: (e as Error).message || "This track didn't play." }));
    }
  };

  const list = (
    <div data-testid="album-tracks" className="text-sm">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-amber-500/15">
        <p className="font-serif text-amber-100 truncate">{albumTitle}</p>
        <button type="button" onClick={() => onOpenChange(false)} aria-label="Close track list" className="p-1 text-amber-100/70 hover:text-amber-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="px-3 py-4 text-rose-300">{error}</p>}
      {!error && !tracks && (
        <div className="flex items-center gap-2 px-3 py-4 text-amber-100/70"><Loader2 className="h-4 w-4 animate-spin" /> Loading tracks…</div>
      )}
      {tracks && (
        <ol className="max-h-[55vh] overflow-y-auto py-1">
          {tracks.map((t) => {
            const isPlaying = playing === t.index;
            const isLoading = loadingIdx === t.index;
            return (
              <li key={t.index} data-track-row={t.number} className={`px-3 py-2 ${isPlaying ? 'bg-amber-500/10' : ''}`}>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => void toggle(t)}
                    aria-label={isPlaying ? `Pause ${t.title}` : `Play ${t.title}`}
                    className="shrink-0 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                  <span className="w-5 shrink-0 text-right text-xs text-amber-100/60 tabular-nums">{t.number}</span>
                  <span className="flex-1 min-w-0 truncate text-amber-50">{t.title}</span>
                  <span className="shrink-0 text-xs text-amber-100/60 tabular-nums">{fmt(t.durationSeconds)}</span>
                  {t.single && !t.full && onBestowTrack && (
                    <button
                      type="button"
                      onClick={() => onBestowTrack(t)}
                      className="shrink-0 rounded-full border border-amber-400/50 px-2 py-0.5 text-[11px] text-amber-200 hover:bg-amber-500/10"
                    >
                      Bestow ${t.single.price.toFixed(2)}
                    </button>
                  )}
                </div>
                {isPlaying && (
                  <div className="mt-1.5 pl-[3.25rem]">
                    <div className="h-1 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                    <p className="mt-0.5 text-[10px] text-amber-100/60" data-testid="track-mode">
                      {t.full ? 'Full track' : '45s preview'} · {fmt(elapsed)}
                    </p>
                  </div>
                )}
                {rowError[t.index] && <p className="mt-1 pl-[3.25rem] text-[11px] text-rose-300">{rowError[t.index]}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {children}
        {open && createPortal(
          <div className="fixed inset-0 z-[10080] flex items-end bg-black/60" onClick={() => onOpenChange(false)}>
            <div
              className="w-full rounded-t-2xl bg-[#180f08] border-t border-amber-500/20 pb-[env(safe-area-inset-bottom)]"
              onClick={(e) => e.stopPropagation()}
            >
              {list}
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="z-[10080] w-[22rem] p-0 bg-[#180f08] border-amber-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {list}
      </PopoverContent>
    </Popover>
  );
}
