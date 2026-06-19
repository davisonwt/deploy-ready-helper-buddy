// PayPal payout strategy. Delegates the actual API call to the internal
// paypal-payout edge function so PayPal credentials and the Payouts API
// JWT live in one place.
//
// Requires the leg's destination to be a PayPal email (set when the bestowal
// was created from the sower's user_wallets row with wallet_type='paypal_email').

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type {
  PayoutContext,
  PayoutLeg,
  PayoutResult,
  PayoutStrategy,
} from "./types.ts";

export class PayPalPayoutStrategy implements PayoutStrategy {
  readonly provider = "paypal" as const;

  async dispatch(leg: PayoutLeg, ctx: PayoutContext): Promise<PayoutResult> {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return {
        status: "manual_required",
        error: "supabase_config_missing",
      };
    }

    if (!leg.destination || !leg.destination.includes("@")) {
      return {
        status: "manual_required",
        error: "paypal_destination_not_email",
      };
    }

    const invoker = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    try {
      const { data, error } = await invoker.functions.invoke(
        "paypal-payout",
        {
          body: {
            bestowalId: ctx.bestowalId,
            role: leg.role,
            receiverEmail: leg.destination,
            amount: leg.amount,
            currency: leg.currency,
          },
        },
      );

      if (error) {
        return {
          status: "manual_required",
          error: error.message ?? "paypal_payout_invoke_failed",
        };
      }

      const result = data as Partial<PayoutResult> | null;
      if (!result?.status) {
        return {
          status: "manual_required",
          error: "paypal_payout_no_status",
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
