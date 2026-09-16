import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Several storage buckets were made private for security. Any image URL that
 * points at a private bucket must be re-signed before it will render, otherwise
 * the <img> silently 400s and the card shows an empty placeholder.
 */
const PUBLIC_BUCKETS = new Set([
  'biz-ads',
  'book-images',
  'live-session-art',
  'memry-media',
  'orchard-audio',
  'orchard-videos',
  'product-videos',
  'provider-assets',
  'radio_documents',
  'segment-documents',
  'service-provider-images',
  // Public in Supabase (storage.buckets.public = true). Without it here every
  // stall front and interior paid for a needless signing round trip on each
  // view, and the URL came back as /object/sign/ for an image anyone can read.
  'stalls',
  'stay-photos',
  'stream-thumbnails',
]);

export interface StorageObjectRef {
  bucket: string;
  key: string;
}

/** Extract { bucket, key } from a Supabase storage URL that needs signing. */
export function parsePrivateStorageUrl(url?: string | null): StorageObjectRef | null {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('/storage/v1/object/')) return null;
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://sow2growapp.com');
    const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const bucket = decodeURIComponent(match[1]);
    if (PUBLIC_BUCKETS.has(bucket)) return null;
    const key = decodeURIComponent(match[2].split('?')[0]);
    if (!key) return null;
    return { bucket, key };
  } catch {
    return null;
  }
}

const cache = new Map<string, string>();

async function signOne(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;
  const ref = parsePrivateStorageUrl(url);
  if (!ref) return url;
  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.key, 60 * 60 * 6);
  if (error || !data?.signedUrl) return url;
  cache.set(url, data.signedUrl);
  return data.signedUrl;
}

/** Sign a single image URL (returns the original while resolving / on failure). */
export function useSignedImage(url?: string | null): string | null {
  const list = useSignedImages(url ? [url] : []);
  return list[0] ?? null;
}

/**
 * Sign a list of image URLs, preserving order.
 *
 * A URL that NEEDS signing is withheld (null) until its signed form is
 * ready, rather than being handed over raw for one render first. Handing
 * over the raw form means the browser immediately requests a
 * /object/public/ link to a private bucket, gets HTTP 400, and fires the
 * <img>'s error event before the signed URL ever arrives. Callers with a
 * destructive onError -- FilePreview flips to an error state, AdminSeedsPage
 * hides the element -- would act on that phantom failure permanently.
 * Public and non-storage URLs are still returned immediately.
 */
export function useSignedImages(urls: string[]): (string | null)[] {
  const key = urls.join('|');
  const initial = (list: string[]) => list.map((u) => (parsePrivateStorageUrl(u) ? null : u));
  const [resolved, setResolved] = useState<(string | null)[]>(() => initial(urls));

  useEffect(() => {
    let alive = true;
    const list = key ? key.split('|') : [];
    setResolved(initial(list));
    if (!list.some((u) => parsePrivateStorageUrl(u))) return;
    Promise.all(list.map(signOne)).then((signed) => {
      if (alive) setResolved(signed);
    });
    return () => { alive = false; };
  }, [key]);

  return resolved;
}
