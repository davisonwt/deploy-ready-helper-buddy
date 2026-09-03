import { BinancePayClient } from "./binance.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { S2G_FEE_RATE, backOutFee } from "./platformFee.ts";

export interface DistributionData {
  total_amount: number;
  currency: string;
  holding_wallet: string;
  tithing_admin_wallet: string;
  tithing_admin_amount: number;
  /**
   * The owner's resolved payout address/email at snapshot time, informational
   * only — nothing in the modern payout path (owed_payout_balances(),
   * payout-earnings, credit_earning_for_gift_bestowal) reads this field, all
   * of them resolve the rail fresh from profiles/user_wallets at payout
   * time. Only the legacy Binance-only executeDistribution() actually pays
   * out to this address. null when the owner hasn't configured any payout
   * method yet — never a reason to block the sale (see resolveOwnerPayout
   * below).
   */
  sower_wallet: string | null;
  sower_amount: number;
  sower_user_id?: string;
  mode: "automatic" | "manual";
  hold_reason?: string | null;
  orchard_type?: string | null;
  courier_required?: boolean;
  proof_sent_at?: string | null;
  manual_release_at?: string | null;
  manual_release_user_id?: string | null;
  percentages: {
    holding: number;
    tithing_admin: number;
    sower: number;
  };
  /**
   * Which fee convention produced sower_amount/tithing_admin_amount on this
   * row:
   *   'fee_inclusive' — orchards: pocket_price already has S2G's 15% baked
   *     in at orchard-creation time, backed out here (base = gross / 1.15).
   *   'gross_up' — gifts/tips (buildGiftDistribution): base(x)=the value the
   *     giver set, S2G's 15% is added on top of the buyer's charge.
   *   'deduction' — legacy, or the field is absent entirely: predates the
   *     unified fee model, computed by taking a tithing % out of the
   *     sower's amount instead — see spec-unified-fee-model.md.
   * Nothing currently reads this at payout time (dispatchPayouts/
   * executeDistribution replay whatever is already stored here rather than
   * recomputing), but it's kept for audit/reporting and so a future payout
   * change can't silently misinterpret a legacy row.
   */
  fee_model?: "gross_up" | "deduction" | "fee_inclusive";
  generated_at: string;
}

export interface DistributionContext {
  orchardId: string;
  orchardTitle: string;
  orchardUserId: string;
  /**
   * pocket_price × pocketsCount. Fee-inclusive by design — orchard
   * pocket_price already has S2G's 15% baked in at orchard-creation time
   * (see CreateOrchardPage.jsx / SeedSubmissionPage.jsx), so nothing is
   * added on top of this at checkout. buildDistributionData backs the fee
   * back out rather than adding another 15%.
   */
  baseAmount: number;
  currency: string;
  distributionMode?: "automatic" | "manual";
  holdReason?: string | null;
  orchardType?: string | null;
  courierRequired?: boolean;
  productType?: string | null;
}

export async function buildDistributionData(
  supabase: SupabaseClient,
  context: DistributionContext,
): Promise<DistributionData> {
  const distributionMode = context.distributionMode ?? "automatic";

  const wallets = await fetchOrganizationWallets(supabase, [
    "s2gholding",
    "s2gbestow",
  ]);

  if (!wallets.s2gholding) {
    throw new Error("Holding wallet (s2gholding) is not configured");
  }

  if (!wallets.s2gbestow) {
    throw new Error("Tithing wallet (s2gbestow) is not configured");
  }

  // Resolved the same way payout-earnings resolves a recipient's rail —
  // profiles.payout_network/payout_address for Solana, else a verified
  // PayPal email — not a Binance-only lookup (that dependency predates the
  // Solana/PayPal era and, until this fix, hard-blocked checkout for any
  // orchard owner without a binance_pay wallet row, which is effectively
  // everyone today). Unlike the old Binance path, a missing payout method
  // here is never a reason to fail the bestowal: null just means the owner
  // hasn't configured one yet, same as payout-earnings' own "keeps accruing,
  // never blocks a sale" rule for every other source table.
  const sowerWallet = await resolveOwnerPayout(supabase, context.orchardUserId);

  // pocket_price is fee-inclusive — S2G's 15% is baked in at orchard-creation
  // time, not added on top at checkout. Back it out of what was actually
  // collected rather than adding another 15% on top of it.
  const grossAmount = roundAmount(context.baseAmount);
  const { base: sowerAmount, s2gFee: tithingAmount } = backOutFee(grossAmount);

  return {
    total_amount: grossAmount,
    currency: context.currency,
    holding_wallet: wallets.s2gholding,
    tithing_admin_wallet: wallets.s2gbestow,
    tithing_admin_amount: tithingAmount,
    sower_wallet: sowerWallet,
    sower_amount: sowerAmount,
    sower_user_id: context.orchardUserId,
    mode: distributionMode,
    hold_reason: context.holdReason ?? null,
    orchard_type: context.orchardType ?? null,
    courier_required: context.courierRequired ?? false,
    proof_sent_at: null,
    manual_release_at: null,
    manual_release_user_id: null,
    percentages: {
      holding: 1,
      // Share of the gross (fee-inclusive) total, not of the sower's base —
      // S2G_FEE_RATE (0.15) is the rate applied to base, so the tithing
      // share of the gross itself is smaller: tithingAmount / grossAmount.
      tithing_admin: grossAmount > 0 ? roundAmount(tithingAmount / grossAmount) : S2G_FEE_RATE,
      sower: grossAmount > 0 ? roundAmount(sowerAmount / grossAmount) : 1,
    },
    fee_model: "fee_inclusive",
    generated_at: new Date().toISOString(),
  };
}

export interface DistributionResult {
  success: boolean;
  transfers: Array<{
    payee: string;
    amount: number;
    currency: string;
    response: unknown;
  }>;
}

export async function executeDistribution(
  supabase: SupabaseClient,
  binanceClient: BinancePayClient,
  bestowalId: string,
  distribution: DistributionData,
): Promise<DistributionResult> {
  const transfers: DistributionResult["transfers"] = [];

  if (distribution.tithing_admin_amount > 0) {
    const response = await executeTransfer(binanceClient, {
      bestowalId,
      suffix: "tithing",
      wallet: distribution.tithing_admin_wallet,
      amount: distribution.tithing_admin_amount,
      currency: distribution.currency,
      remark: "Bestowal distribution - tithing & admin",
    });

    transfers.push({
      payee: distribution.tithing_admin_wallet,
      amount: distribution.tithing_admin_amount,
      currency: distribution.currency,
      response,
    });
  }

  if (distribution.sower_amount > 0 && distribution.sower_wallet) {
    const response = await executeTransfer(binanceClient, {
      bestowalId,
      suffix: "sower",
      wallet: distribution.sower_wallet,
      amount: distribution.sower_amount,
      currency: distribution.currency,
      remark: "Bestowal distribution - sower",
    });

    transfers.push({
      payee: distribution.sower_wallet,
      amount: distribution.sower_amount,
      currency: distribution.currency,
      response,
    });

    if (distribution.sower_user_id) {
      await incrementWalletBalance(
        supabase,
        distribution.sower_user_id,
        distribution.sower_wallet,
        distribution.sower_amount,
      );
    }
  } else if (distribution.sower_amount > 0) {
    console.warn(
      `executeDistribution: sower ${distribution.sower_user_id ?? "unknown"} owed ${distribution.sower_amount} ` +
        `but has no resolved payout wallet — skipping the legacy Binance leg (modern payout still reads sower_user_id/sower_amount via owed_payout_balances()).`,
    );
  }

  await supabase
    .from("bestowals")
    .update({
      payment_status: "distributed",
      distributed_at: new Date().toISOString(),
    })
    .eq("id", bestowalId);

  return {
    success: true,
    transfers,
  };
}

async function fetchOrganizationWallets(
  supabase: SupabaseClient,
  walletNames: string[],
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("organization_wallets")
    .select("wallet_name, wallet_address")
    .in("wallet_name", walletNames)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  const result: Record<string, string> = {};
  for (const wallet of data ?? []) {
    result[wallet.wallet_name] = wallet.wallet_address;
  }

  return result;
}

/**
 * Same resolution payout-earnings uses for a recipient's rail (see that
 * function's own comment): profiles.payout_network==='solana_usdc' wins if
 * an address is set; otherwise the most-primary-then-most-recently-updated
 * verified PayPal email from user_wallets. Returns null rather than
 * throwing when neither is configured — this is a snapshot for display/
 * audit, not a gate on whether the bestowal can proceed.
 */
async function resolveOwnerPayout(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("payout_network, payout_address")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.payout_network === "solana_usdc" && profile?.payout_address) {
    return profile.payout_address;
  }

  const { data: wallet } = await supabase
    .from("user_wallets")
    .select("wallet_address")
    .eq("user_id", userId)
    .eq("wallet_type", "paypal_email")
    .eq("is_active", true)
    .not("verified_at", "is", null)
    .order("is_primary", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return wallet?.wallet_address ?? null;
}

async function executeTransfer(
  binanceClient: BinancePayClient,
  params: {
    bestowalId: string;
    suffix: string;
    wallet: string;
    amount: number;
    currency: string;
    remark: string;
  },
) {
  return await binanceClient.createTransfer({
    requestId: `${params.bestowalId}-${params.suffix}-${crypto.randomUUID()}`,
    payeeId: params.wallet,
    amount: params.amount,
    currency: params.currency,
    remark: params.remark,
  });
}

function roundAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function incrementWalletBalance(
  supabase: SupabaseClient,
  userId: string,
  walletAddress: string,
  amountDelta: number,
) {
  try {
    const { data: existing } = await supabase
      .from("wallet_balances")
      .select("usdc_balance")
      .eq("user_id", userId)
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    const currentBalance = Number(existing?.usdc_balance ?? 0);
    const newBalance = roundAmount(currentBalance + amountDelta);

    await supabase.rpc("update_wallet_balance_secure", {
      target_user_id: userId,
      target_wallet_address: walletAddress,
      new_balance: newBalance,
    });
  } catch (error) {
    console.error(
      "Failed to increment wallet balance for",
      walletAddress,
      ":", error,
    );
  }
}

// ============================================================================
// Provider-agnostic payout dispatcher (added in Part 2 — additive, non-breaking)
// ----------------------------------------------------------------------------
// `executeDistribution` above remains the legacy Binance-only path used by
// `create-binance-pay-order`, `cryptomus-webhook`, and `distribute-bestowal`.
// New rails (NOWPayments, PayPal) should use `dispatchPayouts` below, which
// reads the snapshot stored on the `bestowals` row to pick a strategy.
// ============================================================================

import {
  getPayoutStrategy,
  type PayoutLeg,
  type PayoutProvider,
  type PayoutResult,
} from "./payouts/index.ts";

interface BestowalPayoutSnapshot {
  id: string;
  payout_provider: string | null;
  payout_destination: string | null;
  payout_currency: string | null;
  distribution_data: DistributionData | null;
}

export function resolvePayoutProvider(
  row: Pick<BestowalPayoutSnapshot, "payout_provider">,
): PayoutProvider {
  const v = (row.payout_provider ?? "").toLowerCase();
  if (v === "nowpayments" || v === "paypal" || v === "binance" || v === "manual") {
    return v;
  }
  // Legacy rows have no snapshot — preserve historic Binance behavior.
  return "binance";
}

/**
 * Dispatch each non-zero distribution leg via the strategy snapshotted on the
 * bestowal row. Writes payout_status/payout_reference/payout_fee_amount/
 * payout_attempted_at/payout_completed_at/payout_error back to bestowals.
 *
 * Returns the aggregate status: 'sent' only if every leg succeeded;
 * 'processing' if any leg is async; 'failed' if any leg hard-failed;
 * 'manual_required' otherwise.
 */
export async function dispatchPayouts(
  supabase: SupabaseClient,
  bestowalId: string,
): Promise<{ status: PayoutResult["status"]; legs: Array<PayoutResult & { role: PayoutLeg["role"] }> }> {
  const { data: bestowal, error } = await supabase
    .from("bestowals")
    .select(
      "id, payout_provider, payout_destination, payout_currency, distribution_data",
    )
    .eq("id", bestowalId)
    .single();

  if (error || !bestowal) {
    throw new Error(`dispatchPayouts: bestowal ${bestowalId} not found`);
  }

  const snapshot = bestowal as BestowalPayoutSnapshot;
  const distribution = snapshot.distribution_data;
  if (!distribution) {
    throw new Error(`dispatchPayouts: bestowal ${bestowalId} has no distribution_data`);
  }

  const provider = resolvePayoutProvider(snapshot);
  const strategy = getPayoutStrategy(provider);

  const legs: PayoutLeg[] = [];

  // Sower leg — uses the snapshot on bestowals (sower-chosen rail), not the
  // Binance address baked into distribution_data.
  if (distribution.sower_amount > 0 && snapshot.payout_destination) {
    legs.push({
      role: "sower",
      userId: distribution.sower_user_id ?? null,
      destination: snapshot.payout_destination,
      currency: snapshot.payout_currency ?? distribution.currency,
      amount: distribution.sower_amount,
    });
  }

  // Tithing leg — always to S2G's internal wallet via Binance for now.
  // TODO(part-6): decide S2G treasury rail; keeping Binance to avoid silent change.
  if (distribution.tithing_admin_amount > 0) {
    const tithingStrategy = getPayoutStrategy("binance");
    legs.push({
      role: "tithing",
      userId: null,
      destination: distribution.tithing_admin_wallet,
      currency: distribution.currency,
      amount: distribution.tithing_admin_amount,
    });
    // dispatched separately below
    void tithingStrategy;
  }

  const attemptedAt = new Date().toISOString();
  await supabase
    .from("bestowals")
    .update({ payout_status: "processing", payout_attempted_at: attemptedAt })
    .eq("id", bestowalId);

  const results: Array<PayoutResult & { role: PayoutLeg["role"] }> = [];
  for (const leg of legs) {
    const s = leg.role === "tithing" ? getPayoutStrategy("binance") : strategy;
    const r = await s.dispatch(leg, { bestowalId, supabase });
    results.push({ ...r, role: leg.role });
  }

  // Aggregate — sower leg dominates status reporting on the bestowals row.
  const sower = results.find((r) => r.role === "sower");
  const headline = sower ?? results[0] ?? { status: "manual_required" as const };

  const update: Record<string, unknown> = {
    payout_status: headline.status,
    payout_reference: sower?.reference ?? null,
    payout_fee_amount: sower?.feeAmount ?? null,
    payout_error: results.find((r) => r.error)?.error ?? null,
  };
  if (headline.status === "sent") {
    update.payout_completed_at = new Date().toISOString();
  }

  await supabase.from("bestowals").update(update).eq("id", bestowalId);

  return { status: headline.status, legs: results };
}
