import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

// getSession() only recovers/refreshes an expired session as part of the
// Supabase client's own construction-time initialize() -- a call made
// later, against an in-memory session that's since expired (the
// background auto-refresh timer only runs while a tab has focus/is
// alive), returns that stale session as-is. A brand-new tab/window
// opened via window.open() used to hit exactly this: its own fresh
// client initializes fine, but if the token it recovered from
// localStorage was already past (or very near) expiry, getSession()
// alone handed back a token the server would reject as unauthorized --
// this is what "Call failed: unauthorized" traced back to (SeedCard's
// Voice/Video button, which used to open the call in a new tab).
// Explicitly checking expiry and calling refreshSession() here closes
// that gap for every caller of this helper, not just the one that
// surfaced it.
const SESSION_EXPIRY_BUFFER_SECONDS = 30;

async function getFreshAccessToken(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData?.session ?? null;
  const nowSeconds = Date.now() / 1000;
  const isStale = !session || !session.expires_at || session.expires_at <= nowSeconds + SESSION_EXPIRY_BUFFER_SECONDS;
  if (isStale) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (!refreshErr && refreshed?.session) session = refreshed.session;
  }
  return session?.access_token ?? null;
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
