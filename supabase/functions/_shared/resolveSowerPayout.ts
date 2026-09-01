// Deterministic sower payout-rail resolver shared by checkout edge functions.
// Candidates come from two places:
//   - user_wallets (nowpayments_crypto / paypal_email rows)
//   - profiles.payout_network = 'solana_usdc' + payout_address — the rail
//     payout-earnings actually sends from (see _shared/solanaPayout.ts).
//     Without this, a sower who has correctly set up Solana still had every
//     buyer rejected here with "no_payout_method": they could be paid, but
//     not bought from.
// Tiebreaker order across all candidates together:
//   1. profiles.preferred_payout_method, if it matches a candidate
//   2. is_primary = true (user_wallets only — the profiles-level Solana
//      destination has no separate primary flag, it's the only one)
//   3. most recently updated
// Returns null when the sower has no active nowpayments_crypto / paypal_email
// wallet AND no valid Solana payout address.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateSolanaAddress } from "./cryptoAddress.ts";

export interface ResolvedSowerPayout {
  wallet_type: "nowpayments_crypto" | "paypal_email" | "solana_usdc";
  wallet_address: string;
  payout_currency: string | null;
  network: string | null;
  payout_provider: "nowpayments" | "paypal" | "solana";
}

interface Candidate {
  wallet_type: "nowpayments_crypto" | "paypal_email" | "solana_usdc";
  wallet_address: string;
  payout_currency: string | null;
  network: string | null;
  preferredMatch: number;
  primary: number;
  updated: number;
}

export async function resolveSowerPayout(
  supabase: SupabaseClient,
  sowerUserId: string,
): Promise<ResolvedSowerPayout | null> {
  // profiles.id is a separate random uuid, NOT the auth user id -- the real
  // FK is profiles.user_id (see commit 1bdbb2fb, same bug fixed on
  // PayoutSettingsPage.tsx's own profile query). Querying .eq("id", ...)
  // here always missed, so preferred_payout_method has silently resolved to
  // null on every call this function has ever made.
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_payout_method, payout_network, payout_address, updated_at")
    .eq("user_id", sowerUserId)
    .maybeSingle();

  const preferred = profile?.preferred_payout_method as
    | "nowpayments_crypto"
    | "paypal_email"
    | "solana_usdc"
    | null
    | undefined;

  const { data: wallets } = await supabase
    .from("user_wallets")
    .select("wallet_type, wallet_address, payout_currency, network, is_primary, updated_at")
    .eq("user_id", sowerUserId)
    .in("wallet_type", ["nowpayments_crypto", "paypal_email"])
    .eq("is_active", true);

  const candidates: Candidate[] = (wallets ?? [])
    .filter((w) => !!w.wallet_address)
    .map((w) => ({
      wallet_type: w.wallet_type as "nowpayments_crypto" | "paypal_email",
      wallet_address: w.wallet_address,
      payout_currency: w.payout_currency ?? null,
      network: w.network ?? null,
      preferredMatch: preferred && w.wallet_type === preferred ? 1 : 0,
      primary: w.is_primary ? 1 : 0,
      updated: w.updated_at ? new Date(w.updated_at).getTime() : 0,
    }));

  // Re-validate the address here rather than trusting "it's non-null" --
  // matches the same check the payout sender does before actually sending.
  // A malformed address must never look like a working payout method.
  if (profile?.payout_network === "solana_usdc" && profile.payout_address) {
    const addrErr = validateSolanaAddress(profile.payout_address);
    if (!addrErr) {
      candidates.push({
        wallet_type: "solana_usdc",
        wallet_address: profile.payout_address,
        payout_currency: "USDC",
        network: "solana",
        preferredMatch: preferred === "solana_usdc" ? 1 : 0,
        primary: 0,
        updated: profile.updated_at ? new Date(profile.updated_at).getTime() : 0,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) =>
    b.preferredMatch - a.preferredMatch ||
    b.primary - a.primary ||
    b.updated - a.updated
  );

  const pick = candidates[0];
  const payout_provider =
    pick.wallet_type === "paypal_email" ? "paypal" :
    pick.wallet_type === "solana_usdc" ? "solana" :
    "nowpayments";

  return {
    wallet_type: pick.wallet_type,
    wallet_address: pick.wallet_address,
    payout_currency: pick.payout_currency,
    network: pick.network,
    payout_provider,
  };
}
