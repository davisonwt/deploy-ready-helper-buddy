import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Referral / "burn the invitation code" helpers.
 *
 * Every share that leaves Sow2Grow MUST carry the sharer's unique
 * invitation code so that a new sign-up automatically becomes a tribe
 * member of the sharer.
 */

export type EnsureReferralCodeResult = {
  code: string;
};

/**
 * The current user's referral code.
 *
 * Minting lives in ONE place now -- the database. This function used to
 * INSERT into `affiliates` itself whenever it could not find an active
 * row, with no unique constraint on `user_id` to stop it: any burst of
 * concurrent callers each inserted their own row. That is how one account
 * reached 927 active codes (344 on 2026-06-12, 375 on 06-13, 207 on
 * 09-06). 954 rows were deactivated on 2026-09-22 and a partial unique
 * index, `affiliates_one_active_per_user`, now makes a second active row
 * per member impossible.
 *
 * `ensure_my_referral_code()` is SECURITY DEFINER and reads auth.uid(),
 * so it needs no userId argument; the parameter is kept so the call sites
 * do not all have to change, and is only used as a "are we signed in at
 * all" guard.
 */
export async function ensureReferralCode(
  userId: string,
): Promise<EnsureReferralCodeResult> {
  if (!userId) throw new Error("ensureReferralCode: no signed-in user");
  const { data, error } = await supabase.rpc("ensure_my_referral_code" as never);
  if (error) throw error;
  const code = data as unknown as string | null;
  if (!code) throw new Error("ensureReferralCode: no code available");
  return { code };
}

/**
 * Burn the user's invitation code into ANY shareable URL inside Sow2Grow.
 *
 * Whether the URL points at a video, seed, orchard, or the home page,
 * the resulting link will always carry `?ref=<CODE>` so that whoever
 * registers from that link is bound to the sharer.
 */
export function burnReferralCode(url: string, code?: string | null): string {
  if (!code) return url;
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("ref", code);
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}ref=${encodeURIComponent(code)}`;
  }
}

/**
 * "Come see my shop" -- builds a stall invite link (burning the CURRENT
 * viewer's own referral code onto it, owner or visitor, guest gets a
 * bare link) and hands it to the OS share sheet on a phone, or the
 * clipboard on desktop. Real domain: window.location.origin, not a
 * hardcoded sow2growapp.com -- the target URL from docs/VERCEL-CUTOVER.md
 * is the same domain post-cutover, so this needs no change when that
 * happens; before it, this correctly shares whatever Vercel/Lovable URL
 * is actually live right now.
 */
export async function shareStallLink(username: string, stallName: string, viewerId?: string | null, opts?: { live?: boolean }): Promise<void> {
  let url = `${window.location.origin}/stall/${username}`;
  // `?live=1` -- an explicit, stable signal that survives the round trip
  // through a copy/paste or a native share sheet, unlike relying on the
  // recipient's own client to detect the live via presence (which races:
  // liveSeeds is empty for the first ~1-2s after a fresh/logged-out
  // client's realtime channel subscribes -- see StallVisitPage.tsx).
  // Caller passes this when the stall is actually live right now (e.g.
  // StallInteriorView's own `ownerIsLive`).
  if (opts?.live) url += "?live=1";
  if (viewerId) {
    try {
      const { code } = await ensureReferralCode(viewerId);
      url = burnReferralCode(url, code);
    } catch {
      // No referral code -- share the bare link rather than block sharing entirely.
    }
  }
  const text = "Come see my stall on Sow2Grow";

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: stallName, text, url });
    } catch {
      // User cancelled the native share sheet -- not an error.
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success("Stall link copied!");
  } catch {
    toast.error("Couldn't copy the link");
  }
}

const WELCOME_INVITER_KEY = "s2g_pending_welcome_inviter";

/**
 * One-time "<Inviter> invited you — welcome" toast after a referred
 * signup. Same localStorage-survives-the-onboarding-chain pattern as
 * s2g_pending_ref/s2g_pending_return -- set right after claim_referral_code
 * resolves a real referrer (useAuth.jsx's register()), read and cleared
 * wherever the visitor actually lands back in the app (StallVisitPage,
 * for the stall-invite flow this was built for), so it survives the
 * email-confirm bounce and the mandatory onboarding chain the same way
 * those two already do.
 */
export function storePendingWelcomeInviter(inviterName: string | null | undefined) {
  if (!inviterName) return;
  try { localStorage.setItem(WELCOME_INVITER_KEY, inviterName); } catch { /* storage might be disabled */ }
}

export function readAndClearPendingWelcomeInviter(): string | null {
  try {
    const name = localStorage.getItem(WELCOME_INVITER_KEY);
    if (name) localStorage.removeItem(WELCOME_INVITER_KEY);
    return name;
  } catch {
    return null;
  }
}
