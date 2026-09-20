import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "s2g_pending_ref";

/**
 * Captures `?ref=CODE` from the URL into localStorage so it survives the
 * email-confirm / OAuth bounce until the user finishes registering.
 */
export function useReferralCapture() {
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const ref = u.searchParams.get("ref");
      if (ref) localStorage.setItem(KEY, ref.trim().toUpperCase());
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
    const attemptClaim = async () => {
      let pending: string | null = null;
      try { pending = localStorage.getItem(KEY); } catch {}
      if (!pending) return;
      try {
        const { data: claimResult, error } = await supabase.rpc("claim_referral_code", { p_code: pending });
        if (cancelled) return;
        if (error) {
          console.error("[referral] retry claim_referral_code errored:", error);
        } else if ((claimResult as any)?.success) {
          try { localStorage.removeItem(KEY); } catch {}
        }
      } catch (err) {
        if (!cancelled) console.error("[referral] retry claim_referral_code threw:", err);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) attemptClaim();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) attemptClaim();
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
}
