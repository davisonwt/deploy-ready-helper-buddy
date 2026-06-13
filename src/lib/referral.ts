import { supabase } from "@/integrations/supabase/client";

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
