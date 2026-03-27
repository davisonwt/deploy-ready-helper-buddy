/**
 * Video loading optimizations.
 *
 * Strategy:
 * - Never autoplay videos in feeds
 * - Use preload="none" for off-screen, "metadata" for visible
 * - Provide poster frames from Supabase image transforms when available
 * - Reduce quality preferences for inline feed playback
 */

/**
 * Returns optimal <video> attributes for feed-level inline playback.
 */
export function feedVideoAttrs() {
  return {
    preload: 'none' as const,
    playsInline: true,
    muted: true,
    loop: true,
    /** Prevent Safari from downloading whole file */
    controlsList: 'nodownload',
  };
}

/**
 * Returns optimal <video> attributes once a card is in-view (Intersection Observer).
 */
export function visibleVideoAttrs() {
  return {
    preload: 'metadata' as const,
    playsInline: true,
    muted: true,
    loop: true,
  };
}

/**
 * Generate a poster URL from a Supabase video's thumbnail or first frame.
 * Falls back to empty string so browser shows nothing rather than
 * downloading the video just for a frame.
 */
export function videoPosterUrl(thumbnailUrl?: string | null): string {
  if (!thumbnailUrl) return '';
  return thumbnailUrl;
}
