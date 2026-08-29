import { invokePaymentFunction } from '@/lib/payments/invokeFunction';

/**
 * Purchase-gated access to a product-sourced seed's full file — the client
 * never gets a signed URL for these except through get-seed-file, which
 * re-checks entitlement (uploader or a completed product_bestowals row) on
 * every call. Returns null on any failure (not entitled, no file, no
 * session, etc.) rather than throwing, so callers can just fall back to a
 * preview the same way a missing URL already does elsewhere.
 *
 * Extracted from MusicTrackDetailPage.tsx so usePreviewPlayer (and anything
 * else that wants "owner/buyer gets the full track") can share it instead
 * of re-implementing the same call.
 */
export async function fetchSeedFileUrl(productId: string, purpose: 'play' | 'download'): Promise<string | null> {
  try {
    const { url } = await invokePaymentFunction<{ url: string }>('get-seed-file', { productId, purpose });
    return url || null;
  } catch (err) {
    console.warn('get-seed-file failed:', err);
    return null;
  }
}
