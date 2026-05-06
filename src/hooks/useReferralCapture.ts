import { useEffect } from "react";

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
