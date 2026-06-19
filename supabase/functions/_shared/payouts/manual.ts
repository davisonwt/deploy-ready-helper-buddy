// Manual fallback strategy: records the leg in sower_payouts for off-platform
// settlement by an operator, returns 'manual_required'.

import type {
  PayoutContext,
  PayoutLeg,
  PayoutResult,
  PayoutStrategy,
} from "./types.ts";

export class ManualPayoutStrategy implements PayoutStrategy {
  readonly provider = "manual" as const;

  async dispatch(leg: PayoutLeg, ctx: PayoutContext): Promise<PayoutResult> {
    try {
      await ctx.supabase.from("sower_payouts").insert({
        user_id: leg.userId,
        amount: leg.amount,
        currency: leg.currency,
        wallet_address: leg.destination,
        wallet_type: "manual",
        payout_provider: "manual",
        status: "manual_required",
        failure_reason: `awaiting_manual_settlement:${leg.role}`,
        metadata: { bestowal_id: ctx.bestowalId, role: leg.role },
      });
    } catch (err) {
      console.warn("[payouts.manual] sower_payouts insert failed:", err);
    }
    return {
      status: "manual_required",
      error: "queued_for_manual_settlement",
    };
  }
}
