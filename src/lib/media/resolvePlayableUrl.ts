import { supabase } from '@/integrations/supabase/client';

const PRIVATE_BUCKETS = new Set(['music-tracks', 'dj-music', 'premium-room']);

function extractBucketAndPath(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2].split('?')[0]) };
  } catch {
    return null;
  }
}

/**
 * Most preview_url values (product-sourced, the public seed-previews
 * bucket) are already directly playable — returned as-is, no round trip.
 * A dj_music_tracks preview_url can point into a private bucket instead;
 * this signs it lazily, only when a card is actually pressed play on, so a
 * page listing many tracks never eagerly signs URLs for cards nobody plays.
 */
export async function resolvePlayableUrl(rawUrl: string): Promise<string | null> {
  const parts = extractBucketAndPath(rawUrl);
  if (!parts || !PRIVATE_BUCKETS.has(parts.bucket)) return rawUrl;
  const { data } = await supabase.storage.from(parts.bucket).createSignedUrl(parts.path, 60 * 60);
  return data?.signedUrl || null;
}
