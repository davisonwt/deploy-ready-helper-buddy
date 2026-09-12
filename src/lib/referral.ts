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
  affiliateId: string;
};

/**
 * Get (or lazily create) the current user's permanent referral code
 * stored in `affiliates.referral_code`.
 */
export async function ensureReferralCode(
  userId: string,
): Promise<EnsureReferralCodeResult> {
  // 1) Try to read an existing affiliate row
  const { data: existing, error: readErr } = await supabase
    .from("affiliates")
    .select("id, referral_code")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (readErr && readErr.code !== "PGRST116") throw readErr;
  if (existing?.referral_code) {
    return { code: existing.referral_code, affiliateId: existing.id };
  }

  // 2) Generate a memorable code and insert
  const code = "S2G-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  const { data: created, error: insertErr } = await supabase
    .from("affiliates")
    .insert({
      user_id: userId,
      referral_code: code,
      earnings: 0,
      commission_rate: 10,
    })
    .select("id, referral_code")
    .single();

  if (insertErr) throw insertErr;
  return { code: created.referral_code, affiliateId: created.id };
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
export async function shareStallLink(username: string, stallName: string, viewerId?: string | null): Promise<void> {
  let url = `${window.location.origin}/stall/${username}`;
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
