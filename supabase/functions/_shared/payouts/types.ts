// Shared types for the payout strategy pattern.
// Each strategy dispatches ONE leg (sower / tithing / grower) for ONE bestowal.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type PayoutProvider = "nowpayments" | "paypal" | "binance" | "manual";

export type PayoutLegRole = "sower" | "tithing" | "grower";

export interface PayoutLeg {
  role: PayoutLegRole;
  userId: string | null;
  destination: string;
  currency: string;
  amount: number;
  /** Optional, e.g. NOWPayments crypto network ("trx", "eth", "bsc"). */
  network?: string | null;
}

/**
 * Payout lifecycle states.
 * - sent: funds left our account / provider confirmed terminal success
 * - processing: provider accepted, awaiting async confirmation (e.g. PayPal webhook)
 * - awaiting_2fa: provider created the payout but it requires a human to type a
 *   2FA code before funds move (NOWPayments mass payouts work this way by design).
 *   Distinct from manual_required — the automated path DID run, it just needs a
 *   human checkpoint to finalize.
 * - failed: provider rejected
 * - manual_required: no automated path is configured for this leg; an operator
 *   must pay out by hand.
 */
export type PayoutStatus =
  | "sent"
  | "processing"
  | "awaiting_2fa"
  | "failed"
  | "manual_required";

export interface PayoutResult {
  status: PayoutStatus;
  reference?: string;
  feeAmount?: number;
  error?: string;
  raw?: unknown;
}

export interface PayoutContext {
  bestowalId: string;
  supabase: SupabaseClient;
}

export interface PayoutStrategy {
  readonly provider: PayoutProvider;
  dispatch(leg: PayoutLeg, ctx: PayoutContext): Promise<PayoutResult>;
}
