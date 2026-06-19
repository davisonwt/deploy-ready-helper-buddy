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

export type PayoutStatus = "sent" | "processing" | "failed" | "manual_required";

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
