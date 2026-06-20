// Deterministic sower payout-rail resolver shared by checkout edge functions.
// Tiebreaker order:
//   1. profiles.preferred_payout_method, if it matches an active user_wallets row
//   2. is_primary = true
//   3. most recently updated
// Returns null when the sower has no active nowpayments_crypto / paypal_email wallet.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface ResolvedSowerPayout {
  wallet_type: "nowpayments_crypto" | "paypal_email";
  wallet_address: string;
  payout_currency: string | null;
  network: string | null;
  payout_provider: "nowpayments" | "paypal";
}

export async function resolveSowerPayout(
  supabase: SupabaseClient,
  sowerUserId: string,
): Promise<ResolvedSowerPayout | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_payout_method")
    .eq("id", sowerUserId)
    .maybeSingle();

  const preferred = profile?.preferred_payout_method as
    | "nowpayments_crypto"
    | "paypal_email"
    | null
    | undefined;

  const { data: wallets } = await supabase
    .from("user_wallets")
    .select("wallet_type, wallet_address, payout_currency, network, is_primary, updated_at")
    .eq("user_id", sowerUserId)
    .in("wallet_type", ["nowpayments_crypto", "paypal_email"])
    .eq("is_active", true);

  if (!wallets || wallets.length === 0) return null;

  const scored = wallets
    .filter((w) => !!w.wallet_address)
    .map((w) => ({
      w,
      preferredMatch: preferred && w.wallet_type === preferred ? 1 : 0,
      primary: w.is_primary ? 1 : 0,
      updated: w.updated_at ? new Date(w.updated_at).getTime() : 0,
    }))
    .sort((a, b) =>
      b.preferredMatch - a.preferredMatch ||
      b.primary - a.primary ||
      b.updated - a.updated
    );

  const pick = scored[0]?.w;
  if (!pick) return null;

  const wt = pick.wallet_type as "nowpayments_crypto" | "paypal_email";
  return {
    wallet_type: wt,
    wallet_address: pick.wallet_address,
    payout_currency: pick.payout_currency ?? null,
    network: pick.network ?? null,
    payout_provider: wt === "paypal_email" ? "paypal" : "nowpayments",
  };
}
