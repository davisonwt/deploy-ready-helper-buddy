// Create a PayPal CHECKOUT order for an orchard bestowal.
// Mirrors create-nowpayments-invoice but uses PayPal Orders v2.
// Returns the order id + approve_url for buyer redirect.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildDistributionData } from "../_shared/distribution.ts";
import { paypalFetch } from "../_shared/paypal/client.ts";
import { computeBuyerFee } from "../_shared/paypal/fees.ts";
import { resolveSowerPayout } from "../_shared/resolveSowerPayout.ts";

interface RequestPayload {
  orchardId: string;
  pocketsCount: number;
  message?: string;
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }
    if (!paypalClientId || !paypalSecret) {
      return json({ error: "paypal_credentials_missing" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }

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
      return json(
        { error: "missing_fields", required: ["orchardId", "pocketsCount"] },
        400,
      );
    }

    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // --- Resolve orchard + price (server-side) -------------------------------
    const { data: orchard, error: orchardError } = await service
      .from("orchards")
      .select(
        "id, title, user_id, pocket_price, currency, status, orchard_type, courier_cost, product_type",
      )
      .eq("id", payload.orchardId)
      .single();
    if (orchardError || !orchard) return json({ error: "orchard_not_found" }, 404);
    if (orchard.status !== "active") return json({ error: "orchard_inactive" }, 400);

    const pocketPrice = Number(orchard.pocket_price);
    if (!Number.isFinite(pocketPrice) || pocketPrice <= 0) {
      return json({ error: "orchard_pricing_invalid" }, 400);
    }
    const baseAmount = round2(pocketPrice * payload.pocketsCount);

    // --- Processor fee on top (paid by buyer) --------------------------------
    const feePct = Number(Deno.env.get("PAYPAL_FEE_PCT") ?? "0.01");
    const processorFee = ceil2(baseAmount * (Number.isFinite(feePct) ? feePct : 0.01));
    const buyerTotal = round2(baseAmount + processorFee);

    // --- Resolve sower's preferred payout wallet (shared deterministic resolver) ---
    // The buyer paid via PayPal, but the sower's payout rail is whichever they
    // configured (NOWPayments crypto OR PayPal email). We never block a PayPal-in
    // payment because the sower chose a crypto payout.
    const wallet = await resolveSowerPayout(service, orchard.user_id);
    if (!wallet) {
      return json(
        {
          error: "no_payout_method",
          message: "Sower has no active NOWPayments or PayPal payout wallet configured.",
        },
        409,
      );
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
      totalAmount: baseAmount, // 15% S2G fee is on base, NOT on processor fee
      currency,
      growerUserId: payload.growerId ?? null,
      distributionMode: productType === "digital" ? "automatic" : "manual",
      holdReason: null,
      orchardType,
      courierRequired,
      productType,
    });

    // --- Insert bestowals row (snapshot before calling PayPal) ---------------
    const { data: bestowal, error: insertError } = await service
      .from("bestowals")
      .insert({
        orchard_id: orchard.id,
        bestower_id: userData.user.id,
        amount: buyerTotal, // legacy mirror
        currency,
        pockets_count: payload.pocketsCount,
        message: payload.message ?? null,
        payment_method: "paypal",
        payment_status: "pending",
        distribution_data: distribution,
        provider: "paypal",
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
      console.error("bestowals insert failed", insertError);
      return json(
        { error: "bestowal_insert_failed", detail: insertError?.message },
        500,
      );
    }

    // --- Create PayPal order -------------------------------------------------
    const redirectBase = payload.redirectBaseUrl ?? "https://sow2growapp.com";
    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: bestowal.id,
          custom_id: bestowal.id,
          description: `Sow2Grow bestowal for ${orchard.title}`.slice(0, 127),
          amount: {
            currency_code: "USD",
            value: buyerTotal.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "Sow2Grow",
        user_action: "PAY_NOW",
        return_url: `${redirectBase}/bestowals/${bestowal.id}?status=success`,
        cancel_url: `${redirectBase}/bestowals/${bestowal.id}?status=cancelled`,
      },
    };

    const { ok, status, data, raw } = await paypalFetch<PaypalOrderResponse>(
      "/v2/checkout/orders",
      { method: "POST", body: orderBody },
    );

    if (!ok || !data?.id) {
      console.error("paypal create order failed", status, raw);
      await service
        .from("bestowals")
        .update({
          payment_status: "failed",
          payout_error: `paypal_order_failed:${status}`,
        })
        .eq("id", bestowal.id);
      return json(
        { error: "paypal_order_failed", status, body: raw },
        502,
      );
    }

    const approveLink = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
    await service
      .from("bestowals")
      .update({ provider_order_id: data.id })
      .eq("id", bestowal.id);

    return json({
      bestowalId: bestowal.id,
      orderId: data.id,
      approveUrl: approveLink?.href ?? null,
      breakdown: {
        baseAmount,
        processorFee,
        processorFeePct: feePct,
        buyerTotal,
        currency: "USD",
      },
    });
  } catch (err) {
    console.error("create-paypal-order error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function ceil2(n: number): number {
  return Math.ceil((n - Number.EPSILON) * 100) / 100;
}
