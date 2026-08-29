// "Where to send someone back to" after register/login — same client-storage
// pattern as useReferralCapture.ts's s2g_pending_ref, so it survives the
// register -> /onboarding/security -> /onboarding/payout chain (and an
// email-confirm bounce, same-browser) the same way the referral code does.

const KEY = "s2g_pending_return";

/** Only a same-origin relative path is ever accepted — never an absolute URL (open-redirect guard). */
export function sanitizeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

export function storePendingReturn(path: string | null | undefined) {
  const safe = sanitizeReturnPath(path);
  if (!safe) return;
  try { localStorage.setItem(KEY, safe); } catch {}
}

export function readPendingReturn(): string | null {
  try { return sanitizeReturnPath(localStorage.getItem(KEY)); } catch { return null; }
}

export function clearPendingReturn() {
  try { localStorage.removeItem(KEY); } catch {}
}
