import { Loader2, Pause, Play } from 'lucide-react';
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer';

interface PreviewPlayerProps {
  /** Unique key for cross-card "only one plays at a time" coordination — usually the product id. */
  id: string;
  previewUrl: string | null;
  /** Owner/buyer upgrade to the full file via get-seed-file — omit for content with no such concept (e.g. dj_music_tracks). */
  productId?: string | null;
  className?: string;
}

/**
 * Small play/pause overlay for a seed's cover — progress bar + a
 * "45s preview" / "Full track" label. Renders nothing when there's no
 * preview_url: a card with no preview shows no play button at all,
 * regardless of ownership (get-seed-file is only ever tried as an upgrade
 * once a preview exists to fall back to). Meant to sit inside a
 * `relative`-positioned cover container, absolutely positioned along its
 * bottom edge.
 */
export default function PreviewPlayer({ id, previewUrl, productId, className = '' }: PreviewPlayerProps) {
  const { isPlaying, isLoading, progress, isFullTrack, toggle } = usePreviewPlayer({ id, previewUrl, productId });

  if (!previewUrl) return null;

  return (
    <div
      className={`absolute bottom-0 inset-x-0 flex items-center gap-2 px-2.5 py-2 bg-black/70 backdrop-blur-sm ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
        className="shrink-0 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center transition-colors"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1 rounded-full bg-white/25 overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-[width] duration-150"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] font-medium text-white/85 truncate">
          {isFullTrack ? 'Full track' : '45s preview'}
        </p>
      </div>
    </div>
  );
}
