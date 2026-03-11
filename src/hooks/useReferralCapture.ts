import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const COOKIE_NAME = 's2g_ref';
const COOKIE_DAYS = 30;

export function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Hook that captures ?ref=CODE from any URL, stores it in a cookie,
 * and tracks the click. Place this at the App root level.
 */
export function useReferralCapture() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (!refCode) return;

    // Store in cookie
    setCookie(COOKIE_NAME, refCode, COOKIE_DAYS);

    // Remove ?ref= from URL without reload
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('ref');
    setSearchParams(newParams, { replace: true });

    // Track click (once per session)
    const sessionKey = `s2g_ref_tracked_${refCode}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, '1');
      trackReferralClick(refCode);
    }
  }, [searchParams, setSearchParams]);
}

async function trackReferralClick(code: string) {
  try {
    // Increment total_clicks directly via RPC or update
    // Using a simple approach: call the edge function
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'zuwkgasbkpjlxzsjzumu';
    await fetch(`https://${projectId}.supabase.co/functions/v1/track-referral-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch (e) {
    // Silent fail - click tracking is non-critical
    console.warn('Referral click tracking failed:', e);
  }
}

export function getReferralCode(): string | null {
  return getCookie(COOKIE_NAME);
}

export function clearReferralCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
