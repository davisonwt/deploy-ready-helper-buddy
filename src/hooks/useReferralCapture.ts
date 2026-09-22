import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "s2g_pending_ref";
/** When KEY was captured, epoch ms. Written with it, read by the guard below. */
const AT_KEY = "s2g_pending_ref_at";

/**
 * Clock skew allowance between the browser that captured the code and the
 * server that stamped auth.users.created_at. Only matters when the two are
 * already within minutes of each other, which is the legitimate
 * capture-then-register case; it never widens far enough to admit an
 * account created long before the capture.
 */
const SKEW_TOLERANCE_MS = 10 * 60 * 1000;

/**
 * A capture with no timestamp predates this guard. It is allowed only for
 * an account created in the last few minutes -- an in-flight signup across
 * the deploy -- and never for an established one.
 */
const RECENT_SIGNUP_MS = 10 * 60 * 1000;

/**
 * Captures `?ref=CODE` from the URL into localStorage so it survives the
 * email-confirm / OAuth bounce until the user finishes registering.
 */
export function useReferralCapture() {
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const ref = u.searchParams.get("ref");
      if (ref) {
        localStorage.setItem(KEY, ref.trim().toUpperCase());
        localStorage.setItem(AT_KEY, String(Date.now()));
      }
    } catch {}
  }, []);

  // Retry a pending code that a previous signup's best-effort claim call
  // (in useAuth.jsx's register()) never confirmed as successful -- that
  // call is single-attempt with no server-side retry, and used to clear
  // this key unconditionally even on failure, silently losing the only
  // evidence a code was ever pending. Fires on initial session check and
  // on every future sign-in anywhere in the app; safe to call repeatedly
  // since claim_referral_code/process_referral is idempotent (a
  // NOT EXISTS guard makes an already-claimed user's repeat call a no-op).
  useEffect(() => {
    let cancelled = false;

    /**
     * A pending code may only be claimed by an account that did not exist
     * when the code was captured.
     *
     * Without this, the retry below rebinds ANY signed-in member whose
     * referred_by is still null the moment they open someone's invite
     * link: capture writes the code, the next session check claims it,
     * and process_referral happily records it because its only guards are
     * self-referral and already-referred. On 2026-09-22 that bound the
     * founder's account to another member from a single page load.
     */
    const mayClaim = (createdAtIso: string | undefined): boolean => {
      const createdAt = createdAtIso ? Date.parse(createdAtIso) : NaN;
      if (!Number.isFinite(createdAt)) return false;
      let capturedAt = NaN;
      try { capturedAt = Number(localStorage.getItem(AT_KEY)); } catch { /* storage blocked */ }
      if (!Number.isFinite(capturedAt) || capturedAt <= 0) {
        // Captured before this guard shipped: only an account created just
        // now can plausibly be the signup that capture was for.
        return Date.now() - createdAt <= RECENT_SIGNUP_MS;
      }
      return createdAt >= capturedAt - SKEW_TOLERANCE_MS;
    };

    const attemptClaim = async (createdAtIso?: string) => {
      let pending: string | null = null;
      try { pending = localStorage.getItem(KEY); } catch {}
      if (!pending) return;
      if (!mayClaim(createdAtIso)) {
        // The account predates the capture: this is an existing member
        // browsing an invite link, not a referred signup. Drop the code
        // rather than leave it to be claimed by some later session.
        clearPendingReferral();
        return;
      }
      try {
        const { data: claimResult, error } = await supabase.rpc("claim_referral_code", { p_code: pending });
        if (cancelled) return;
        if (error) {
          console.error("[referral] retry claim_referral_code errored:", error);
        } else if ((claimResult as any)?.success) {
          clearPendingReferral();
        }
      } catch (err) {
        if (!cancelled) console.error("[referral] retry claim_referral_code threw:", err);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user?.id) attemptClaim(user.created_at);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) attemptClaim(session.user.created_at);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);
}

export function readPendingReferral(): string | null {
  try {
    const u = new URL(window.location.href);
    const ref = u.searchParams.get("ref");
    if (ref) return ref.trim().toUpperCase();
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingReferral() {
  try { localStorage.removeItem(KEY); } catch {}
  try { localStorage.removeItem(AT_KEY); } catch {}
}
