// NOWPayments payout strategy. Delegates the actual API call to the internal
// nowpayments-payout edge function (built in step 5) so the JWT/2FA token is
// only handled in one place.
//
// Until step 5 lands, invoking this strategy will surface 'manual_required'
// because the underlying edge function doesn't exist yet — that's intentional
// and matches the plan's "fail loud" behavior.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type {
  PayoutContext,
  PayoutLeg,
  PayoutResult,
  PayoutStrategy,
} from "./types.ts";

export class NowPaymentsPayoutStrategy implements PayoutStrategy {
  readonly provider = "nowpayments" as const;

  async dispatch(leg: PayoutLeg, ctx: PayoutContext): Promise<PayoutResult> {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return {
        status: "manual_required",
        error: "supabase_config_missing",
      };
    }

    const invoker = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    try {
      const { data, error } = await invoker.functions.invoke(
        "nowpayments-payout",
        {
          body: {
            bestowalId: ctx.bestowalId,
            role: leg.role,
            address: leg.destination,
            currency: leg.currency,
            network: leg.network ?? null,
            amount: leg.amount,
          },
        },
      );

      if (error) {
        return {
          status: "manual_required",
          error: error.message ?? "nowpayments_payout_invoke_failed",
        };
      }

      const result = data as Partial<PayoutResult> | null;
      if (!result?.status) {
        return {
          status: "manual_required",
          error: "nowpayments_payout_no_status",
          raw: data,
        };
      }
      return {
        status: result.status,
        reference: result.reference,
        feeAmount: result.feeAmount,
        error: result.error,
        raw: result.raw ?? data,
      };
    } catch (err) {
      return {
        status: "manual_required",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
