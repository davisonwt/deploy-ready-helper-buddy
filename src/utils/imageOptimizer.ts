/**
 * Image optimization utilities for Supabase Storage.
 * Uses Supabase's built-in image transformation API to serve
 * compressed, correctly-sized images (WebP with fallback).
 *
 * Supabase transform URL pattern:
 *   /storage/v1/render/image/public/{bucket}/{path}?width=W&quality=Q&format=origin
 *
 * For non-Supabase URLs we append nothing (the CDN/origin handles it).
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

interface ImageOptOptions {
  /** Desired display width in CSS pixels (will be doubled for retina) */
  width?: number;
  /** Desired display height – used for aspect-ratio sizing only */
  height?: number;
  /** JPEG/WebP quality 1-100 (default 75) */
  quality?: number;
  /** Force a specific format */
  format?: 'webp' | 'avif' | 'origin';
}

/**
 * Given a Supabase storage public URL, return an optimised variant
 * using the render/image transform endpoint.
 *
 * Non-Supabase URLs are returned unchanged.
 */
export function optimizeImageUrl(
  url: string | undefined | null,
  opts: ImageOptOptions = {}
): string {
  if (!url) return '';

  // Only transform Supabase storage URLs
  if (!SUPABASE_URL || !url.includes(SUPABASE_URL)) return url;

  // Already a render URL? Return as-is
  if (url.includes('/render/image/')) return url;

  // Must be a public object URL like:
  // https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const bucketAndPath = url.slice(idx + marker.length);

  // Build render URL
  const params = new URLSearchParams();

  // Double width for retina (cap at 1200 real pixels)
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 2;
  const renderWidth = opts.width ? Math.min(opts.width * dpr, 1200) : undefined;
  if (renderWidth) params.set('width', String(Math.round(renderWidth)));

  params.set('quality', String(opts.quality ?? 75));

  // Request origin format – Supabase will auto-negotiate WebP/AVIF
  // via Accept header when 'format' is omitted
  if (opts.format) params.set('format', opts.format);

  return `${SUPABASE_URL}/storage/v1/render/image/public/${bucketAndPath}?${params.toString()}`;
}

/**
 * Shorthand presets for common display contexts.
 */
export const imagePresets = {
  /** Feed card thumbnail (≈400px wide) */
  feedCard: (url: string) => optimizeImageUrl(url, { width: 400, quality: 70 }),

  /** Avatar (≈48px) */
  avatar: (url: string) => optimizeImageUrl(url, { width: 48, quality: 70 }),

  /** Large avatar / profile header (≈96px) */
  avatarLg: (url: string) => optimizeImageUrl(url, { width: 96, quality: 75 }),

  /** Full-width hero / cover (≈800px) */
  hero: (url: string) => optimizeImageUrl(url, { width: 800, quality: 80 }),

  /** Thumbnail (≈200px) */
  thumb: (url: string) => optimizeImageUrl(url, { width: 200, quality: 65 }),
} as const;
