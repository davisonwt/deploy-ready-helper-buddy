// Create an orchard-pocket bestowal order — the unified provider-switch
// replacement for create-solana-bestowal-order (Solana-only) and
// create-paypal-order (PayPal-only, orchard bestowals). Same pattern as
// create-basket-bestowal-order: one function, one `provider` field
// (balance | solana | paypal), same pocket pricing preserved exactly from
// both predecessors (orchards.pocket_price can already be fee-inclusive at
// orchard-creation time — see the "no gross-up" note below, unchanged).
//
// create-solana-bestowal-order and create-paypal-order are left in place,
// unreachable from checkout once QuickBestowModal/BestowalCheckout are
// repointed here, same retirement pattern spec-payments.md section 6 used
// for create-nowpayments-invoice.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildDistributionData } from "../_shared/distribution.ts";
import { resolveSowerPayout } from "../_shared/resolveSowerPayout.ts";
import { paypalFetch } from "../_shared/paypal/client.ts";
import { computeBuyerFee } from "../_shared/paypal/fees.ts";
import { createSolanaIntent } from "../_shared/solanaPayIn.ts";
import { finalizeCompletedOrder } from "../_shared/paypal/capture.ts";

interface RequestPayload {
  orchardId: string;
  pocketsCount: number;
  provider: "balance" | "solana" | "paypal";
  message?: string;
  /** Accepted but ignored — see create-paypal-order's identical note. */
  growerId?: string | null;
  redirectBaseUrl?: string;
}

interface PaypalOrderResponse {
  id?: string;
  status?: string;
  links?: Array<{ href: string; rel: string; method: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const userId = userData.user.id;

    let payload: RequestPayload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (
      !payload?.orchardId ||
      typeof payload.pocketsCount !== "number" ||
      payload.pocketsCount <= 0
    ) {
      return json({ error: "missing_fields", required: ["orchardId", "pocketsCount"] }, 400);
    }
    if (payload.provider !== "balance" && payload.provider !== "solana" && payload.provider !== "paypal") {
      return json({ error: "invalid_provider" }, 400);
    }

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // --- Resolve orchard + price (server-side) -------------------------------
    const { data: orchard, error: orchardError } = await service
      .from("orchards")
      .select("id, title, user_id, pocket_price, currency, status, orchard_type, courier_cost, product_type")
      .eq("id", payload.orchardId)
      .single();
    if (orchardError || !orchard) return json({ error: "orchard_not_found" }, 404);
    if (orchard.status !== "active") return json({ error: "orchard_inactive" }, 400);

    const pocketPrice = Number(orchard.pocket_price);
    if (!Number.isFinite(pocketPrice) || pocketPrice <= 0) {
      return json({ error: "orchard_pricing_invalid" }, 400);
    }
    const baseAmount = round2(pocketPrice * payload.pocketsCount);

    // No S2G gross-up here — orchards.pocket_price can already be
    // fee-inclusive at orchard-creation time. Preserved unchanged from both
    // predecessor functions; see create-paypal-order's identical note for
    // the full history (spec-unified-fee-model.md).
    const quote = computeBuyerFee(payload.provider, baseAmount);
    const processorFee = quote.fee;
    const feePct = quote.feePct;
    const buyerTotal = quote.total;

    // --- Resolve sower's preferred payout wallet (shared deterministic resolver) ---
    const wallet = await resolveSowerPayout(service, orchard.user_id);
    if (!wallet) {
      return json({ error: "no_payout_method", message: "Sower has no active NOWPayments or PayPal payout wallet configured." }, 409);
    }

    // --- Build distribution snapshot -----------------------------------------
    const currency = orchard.currency ?? "USDC";
    const orchardType = (orchard.orchard_type as string | null) ?? "standard";
    const productType = (orchard.product_type as string | null) ?? "physical";
    const courierRequired = !!(orchard.courier_cost && Number(orchard.courier_cost) > 0);
    const distribution = await buildDistributionData(service, {
      orchardId: orchard.id,
      orchardTitle: orchard.title,
      orchardUserId: orchard.user_id,
      baseAmount,
      currency,
      distributionMode: productType === "digital" ? "automatic" : "manual",
      holdReason: null,
      orchardType,
      courierRequired,
      productType,
    });

    // --- Insert bestowals row (snapshot before calling any processor) --------
    const { data: bestowal, error: insertError } = await service
      .from("bestowals")
      .insert({
        orchard_id: orchard.id,
        bestower_id: userId,
        amount: buyerTotal,
        currency,
        pockets_count: payload.pocketsCount,
        message: payload.message ?? null,
        payment_method: payload.provider,
        payment_status: "pending",
        distribution_data: distribution,
        provider: payload.provider,
        base_amount: baseAmount,
        processor_fee_amount: processorFee,
        processor_fee_currency: "USD",
        buyer_total_amount: buyerTotal,
        payout_provider: wallet.payout_provider,
        payout_destination: wallet.wallet_address,
        payout_currency: wallet.payout_currency ?? (wallet.payout_provider === "paypal" ? "USD" : null),
        payout_status: "pending",
      })
      .select("id")
      .single();
    if (insertError || !bestowal) {
      console.error("orchard bestowal insert failed", insertError);
      return json({ error: "bestowal_insert_failed", detail: insertError?.message }, 500);
    }

    const redirectBase = payload.redirectBaseUrl ?? "https://sow2growapp.com";

    // --- S2G Balance (one-tap, no wallet) --------------------------------------
    if (payload.provider === "balance") {
      const { data: debitRow, error: debitError } = await service.rpc("debit_balance_ledger", {
        _user_id: userId,
        _amount: buyerTotal,
        _kind: "bestow_debit",
        _reference_table: "bestowals",
        _reference_id: bestowal.id,
        _idempotency_key: bestowal.id,
        _created_by: userId,
        _notes: `orchard bestowal for ${orchard.title}`,
      });
      if (debitError) {
        if (debitError.message?.startsWith("insufficient_balance")) {
          const available = Number(debitError.message.split(":")[1] ?? 0);
          await failBestowal(service, bestowal.id, "insufficient_balance");
          return json({ error: "insufficient_balance", available, shortBy: round2(buyerTotal - available) }, 402);
        }
        console.error("balance debit failed", debitError);
        await failBestowal(service, bestowal.id, "balance_debit_failed");
        return json({ error: "balance_debit_failed", detail: debitError.message }, 500);
      }

      await service.from("bestowals").update({ provider_order_id: debitRow.id }).eq("id", bestowal.id);

      try {
        await finalizeCompletedOrder(service, "orchard", bestowal.id, debitRow.id);
      } catch (err) {
        console.error("balance finalize failed", err);
        return json({ error: "finalize_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
      }

      return json({
        bestowalId: bestowal.id,
        provider: "balance",
        balance: { debited: true, ledgerId: debitRow.id },
        breakdown: { baseAmount, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
      });
    }

    // --- Solana (direct USDC pay-in) -------------------------------------------
    if (payload.provider === "solana") {
      let solanaPayment;
      try {
        solanaPayment = await createSolanaIntent(service, {
          orderKind: "orchard",
          orderId: bestowal.id,
          amountUsdc: buyerTotal,
          label: "Sow2Grow",
          message: `Sow2Grow bestowal for ${orchard.title}`,
        });
      } catch (err) {
        console.error("solana intent creation failed", err);
        await failBestowal(service, bestowal.id, "solana_intent_failed");
        return json({ error: "solana_intent_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
      }
      await service.from("bestowals").update({ provider_order_id: solanaPayment.intentId }).eq("id", bestowal.id);
      return json({
        bestowalId: bestowal.id,
        provider: "solana",
        solanaPayment,
        breakdown: { baseAmount, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
      });
    }

    // --- PayPal ---------------------------------------------------------------
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!paypalClientId || !paypalSecret) {
      await failBestowal(service, bestowal.id, "paypal_credentials_missing");
      return json({ error: "paypal_credentials_missing" }, 500);
    }

    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: bestowal.id,
          custom_id: bestowal.id,
          description: `Sow2Grow bestowal for ${orchard.title}`.slice(0, 127),
          amount: { currency_code: "USD", value: buyerTotal.toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Sow2Grow",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            landing_page: "LOGIN",
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            return_url: `${redirectBase}/payment-success?bestowal=${bestowal.id}`,
            cancel_url: `${redirectBase}/payment-cancelled?bestowal=${bestowal.id}`,
          },
        },
      },
      application_context: {
        brand_name: "Sow2Grow",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${redirectBase}/payment-success?bestowal=${bestowal.id}`,
        cancel_url: `${redirectBase}/payment-cancelled?bestowal=${bestowal.id}`,
      },
    };

    const { ok, status, data, raw } = await paypalFetch<PaypalOrderResponse>(
      "/v2/checkout/orders",
      { method: "POST", body: orderBody },
    );

    if (!ok || !data?.id) {
      console.error("paypal create order failed", status, raw);
      await failBestowal(service, bestowal.id, `paypal_order_failed:${status}`);
      return json({ error: "paypal_order_failed", status, body: raw }, 502);
    }

    const approveLink = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
    await service.from("bestowals").update({ provider_order_id: data.id }).eq("id", bestowal.id);

    return json({
      bestowalId: bestowal.id,
      provider: "paypal",
      orderId: data.id,
      approveUrl: approveLink?.href ?? null,
      breakdown: { baseAmount, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
    });
  } catch (err) {
    console.error("create-orchard-bestowal-order error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function failBestowal(service: any, id: string, reason: string) {
  try {
    await service.from("bestowals").update({ payment_status: "failed", payout_error: reason }).eq("id", id);
  } catch (e) {
    console.error("failBestowal update error", reason, e);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
