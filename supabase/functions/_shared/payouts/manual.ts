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
        bestowal_id: ctx.bestowalId,
        user_id: leg.userId,
        destination: leg.destination,
        currency: leg.currency,
        amount: leg.amount,
        role: leg.role,
        status: "manual_required",
      });
    } catch (err) {
      console.warn(
        "[payouts.manual] could not insert sower_payouts row (table may not exist yet):",
        err,
      );
    }
    return {
      status: "manual_required",
      error: "queued_for_manual_settlement",
    };
  }
}
