import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d2tnYXNia3BqbHh6c2p6dW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDk4MjEsImV4cCI6MjA2ODQyNTgyMX0.ffH_7MzNCgyjXf8BFzGDCiVE7Qjptqb9qKBkq3gVbiU';

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
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error('Your session expired — please sign in again to complete this bestowal.');
  }

  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
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
