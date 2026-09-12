import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

// CORRECTION (2026-09-12, re-verified against the installed
// @supabase/supabase-js@2.108.2 source, node_modules/@supabase/auth-js/
// dist/main/GoTrueClient.js __loadSession()): this file originally claimed
// getSession() hands back a stale/expired session as-is unless something
// else explicitly refreshes it first. That is WRONG for this installed
// version -- __loadSession() (which getSession() calls on every single
// invocation, not just once at client construction) checks the recovered
// session's own expiry itself and calls _callRefreshToken() inline before
// returning if it's expired (or within its EXPIRY_MARGIN_MS). A plain
// `await supabase.auth.getSession()` already self-heals an expired
// session on every call, including in a brand-new tab's freshly
// constructed client.
//
// The explicit check below is consequently NOT closing a real gap in this
// supabase-js version -- it's a redundant, harmless duplicate of what
// getSession() already does internally. Left in (rather than removed) as
// defensive belt-and-suspenders against a future supabase-js version
// changing that internal behavior, and because SeedCard's Voice/Video fix
// (same-tab navigation instead of window.open, see SeedCard.tsx) already
// covers the actual, real, still-valid concern with a new tab: cold-start
// latency/race in general, not specifically a "the token doesn't
// self-refresh" bug. Kept the explicit check + this correction rather than
// silently deleting it, so a future reader doesn't have to redo this
// investigation from scratch.
const SESSION_EXPIRY_BUFFER_SECONDS = 30;

async function getFreshAccessToken(): Promise<string | null> {
  const session = await ensureFreshSession();
  return session?.access_token ?? null;
}

/**
 * Defensive duplicate of getSession()'s own internal expiry check (see the
 * correction above) -- for callers that go through
 * `supabase.functions.invoke()` (which reads the token itself from the
 * client's own current session, not one passed in) rather than a raw
 * fetch. Calling this first is a harmless no-op when the session is
 * already fresh (the overwhelmingly common case).
 */
export async function ensureFreshSession() {
  const { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData?.session ?? null;
  const nowSeconds = Date.now() / 1000;
  const isStale = !session || !session.expires_at || session.expires_at <= nowSeconds + SESSION_EXPIRY_BUFFER_SECONDS;
  if (isStale) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (!refreshErr && refreshed?.session) session = refreshed.session;
  }
  return session;
}

/**
 * Call a payment edge function reliably.
 *
 * `supabase.functions.invoke()` throws an opaque "Failed to send a request to
 * the Edge Function" whenever its fetch rejects — a stale access token, a
 * dropped connection or a blocked request all look identical, and the user is
 * left with a checkout that simply refuses to finish.
 *
 * This helper:
 *  1. refreshes/loads the session first so we always send a live bearer token,
 *  2. calls the function with a plain fetch (same URL the SDK uses),
 *  3. surfaces the real HTTP status / server error message,
 *  4. retries once on a genuine network failure before giving up.
 */
export async function invokePaymentFunction<T = any>(
  name: string,
  body: unknown,
  options: { method?: 'GET' | 'POST' } = {},
): Promise<T> {
  const method = options.method ?? 'POST';
  const token = await getFreshAccessToken();
  if (!token) {
    throw new Error('Your session expired — please sign in again and retry.');
  }

  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
  };

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    // One retry: cold starts and flaky mobile connections drop the first
    // call. A short delay first, rather than retrying instantly — an
    // immediate retry can land inside the same still-booting cold-start
    // window that just failed the first attempt.
    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      response = await fetch(url, init);
    } catch {
      throw new Error(
        'Could not reach the payment service. Check your connection (or any ad/script blocker) and try again.',
      );
    }
  }

  const raw = await response.text();
  let parsed: any = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const serverMessage = parsed?.error || parsed?.message || raw?.slice(0, 200);
    throw new Error(serverMessage || `Payment service returned ${response.status}.`);
  }
  if (!raw || parsed === null) {
    throw new Error('The payment service returned an invalid response. Please try again.');
  }
  if (parsed?.error) {
    throw new Error(parsed.error);
  }
  return parsed as T;
}
