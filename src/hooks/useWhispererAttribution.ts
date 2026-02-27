import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const COOKIE_NAME = 's2g_wref';
const COOKIE_DAYS = 30;

interface AttributionData {
  refCode: string;
  refLinkId: string;
  whispererId: string;
  productId?: string;
  orchardId?: string;
  bookId?: string;
  timestamp: number;
}

/** Set a 30-day attribution cookie */
function setAttributionCookie(data: AttributionData) {
  const expires = new Date(Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}; expires=${expires}; path=/; SameSite=Lax`;
}

/** Read the attribution cookie */
export function getAttributionCookie(): AttributionData | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

/** Clear the attribution cookie */
export function clearAttributionCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/**
 * Get attribution for a specific product/orchard/book.
 * First checks URL ?ref= param, then falls back to cookie.
 */
export function getAttributionForProduct(productId?: string, orchardId?: string, bookId?: string): AttributionData | null {
  const cookie = getAttributionCookie();
  if (!cookie) return null;

  // Check if cookie matches this specific product
  if (productId && cookie.productId === productId) return cookie;
  if (orchardId && cookie.orchardId === orchardId) return cookie;
  if (bookId && cookie.bookId === bookId) return cookie;

  return null;
}

/**
 * Hook: handles ?ref= URL param on product/seed pages.
 * - Looks up the ref code
 * - Records a click
 * - Sets a 30-day cookie for delayed attribution
 */
export function useWhispererAttribution(
  productId?: string,
  orchardId?: string,
  bookId?: string
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const refCode = searchParams.get('ref');

  useEffect(() => {
    if (!refCode) return;

    const trackClick = async () => {
      try {
        // Look up the referral link
        const { data: refLink, error } = await supabase
          .from('whisperer_referral_links' as any)
          .select('id, whisperer_id, product_id, orchard_id, book_id, is_active')
          .eq('ref_code', refCode)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !refLink) {
          console.log('[Attribution] Invalid or inactive ref code:', refCode);
          return;
        }

        // Set cookie for 30-day attribution window
        const attributionData: AttributionData = {
          refCode,
          refLinkId: (refLink as any).id,
          whispererId: (refLink as any).whisperer_id,
          productId: (refLink as any).product_id || undefined,
          orchardId: (refLink as any).orchard_id || undefined,
          bookId: (refLink as any).book_id || undefined,
          timestamp: Date.now(),
        };
        setAttributionCookie(attributionData);

        // Record click
        await supabase.from('whisperer_clicks' as any).insert({
          ref_link_id: (refLink as any).id,
          whisperer_id: (refLink as any).whisperer_id,
          product_id: (refLink as any).product_id || null,
          orchard_id: (refLink as any).orchard_id || null,
          book_id: (refLink as any).book_id || null,
          user_id: user?.id || null,
          visitor_id: getVisitorId(),
          user_agent: navigator.userAgent.substring(0, 200),
          referrer_url: document.referrer?.substring(0, 500) || null,
        });

        // Increment click counter on the referral link
        await supabase
          .from('whisperer_referral_links' as any)
          .update({ total_clicks: ((refLink as any).total_clicks || 0) + 1 } as any)
          .eq('id', (refLink as any).id);

        console.log('[Attribution] Click tracked for ref:', refCode);

        // Clean ref param from URL (keeps the page clean)
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('ref');
        setSearchParams(newParams, { replace: true });
      } catch (err) {
        console.error('[Attribution] Error tracking click:', err);
      }
    };

    trackClick();
  }, [refCode, user?.id]);

  return { refCode };
}

/** Generate a simple visitor ID for anonymous click deduplication */
function getVisitorId(): string {
  let id = localStorage.getItem('s2g_visitor_id');
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('s2g_visitor_id', id);
  }
  return id;
}
