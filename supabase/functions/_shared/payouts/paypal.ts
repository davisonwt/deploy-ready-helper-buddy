// PayPal payout strategy stub. Implemented in Part 3.
// Surfaces 'manual_required' so a misconfigured bestowal lands in the
// manual queue instead of silently failing.

import type {
  PayoutContext,
  PayoutLeg,
  PayoutResult,
  PayoutStrategy,
} from "./types.ts";

export class PayPalPayoutStrategy implements PayoutStrategy {
  readonly provider = "paypal" as const;

  // deno-lint-ignore require-await
  async dispatch(_leg: PayoutLeg, _ctx: PayoutContext): Promise<PayoutResult> {
    return {
      status: "manual_required",
      error: "paypal_payouts_not_implemented_yet",
    };
  }
}
