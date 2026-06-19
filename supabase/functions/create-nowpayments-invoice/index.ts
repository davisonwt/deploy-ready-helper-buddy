// Create a NOWPayments hosted invoice for an orchard bestowal.
// Mirrors create-binance-pay-order's price-recompute and bestowal insert,
// but writes the new provider/processor-fee/payout-snapshot columns and
// returns a NOWPayments invoice URL instead of a Binance prepay code.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildDistributionData } from "../_shared/distribution.ts";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

interface RequestPayload {
  orchardId: string;
  pocketsCount: number;
  payCurrency: string; // e.g. 'usdttrc20', 'btc', 'eth'
  message?: string;
  growerId?: string | null;
  redirectBaseUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
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
      payload.pocketsCount <= 0 ||
      !payload.payCurrency
    ) {
      return json({ error: "missing_fields", required: ["orchardId", "pocketsCount", "payCurrency"] }, 400);
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
    const feePct = Number(Deno.env.get("NOWPAYMENTS_FEE_PCT") ?? "0.01");
    const processorFee = ceil2(baseAmount * (Number.isFinite(feePct) ? feePct : 0.01));
    const buyerTotal = round2(baseAmount + processorFee);

    // --- Resolve sower's primary payout wallet -------------------------------
    const { data: wallet } = await service
      .from("user_wallets")
      .select("wallet_type, wallet_address, payout_currency, network")
      .eq("user_id", orchard.user_id)
      .in("wallet_type", ["nowpayments_crypto", "paypal_email"])
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!wallet) {
      return json({ error: "no_payout_method", message: "Sower has no NOWPayments or PayPal payout wallet configured." }, 409);
    }
    const payoutProvider = wallet.wallet_type === "paypal_email" ? "paypal" : "nowpayments";

    // --- Build distribution snapshot (uses existing helper) ------------------
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

    // --- Insert bestowals row (provider snapshot lives here) -----------------
    const { data: bestowal, error: insertError } = await service
      .from("bestowals")
      .insert({
        orchard_id: orchard.id,
        bestower_id: userData.user.id,
        amount: buyerTotal,                  // legacy mirror
        currency,
        pockets_count: payload.pocketsCount,
        message: payload.message ?? null,
        payment_method: "nowpayments",
        payment_status: "pending",
        distribution_data: distribution,
        provider: "nowpayments",
        base_amount: baseAmount,
        processor_fee_amount: processorFee,
        processor_fee_currency: "USD",
        buyer_total_amount: buyerTotal,
        payout_provider: payoutProvider,
        payout_destination: wallet.wallet_address,
        payout_currency: wallet.payout_currency ?? null,
        payout_status: "pending",
      })
      .select("id")
      .single();
    if (insertError || !bestowal) {
      console.error("bestowals insert failed", insertError);
      return json({ error: "bestowal_insert_failed", detail: insertError?.message }, 500);
    }

    // --- Create NOWPayments invoice ------------------------------------------
    const redirectBase = payload.redirectBaseUrl ?? "https://sow2growapp.com";
    const ipnUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;

    const invoiceRes = await fetch(`${NOWPAYMENTS_API}/invoice`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: buyerTotal,
        price_currency: "usd",
        pay_currency: payload.payCurrency,
        order_id: bestowal.id,
        order_description: `Sow2Grow bestowal for ${orchard.title}`,
        ipn_callback_url: ipnUrl,
        success_url: `${redirectBase}/bestowals/${bestowal.id}?status=success`,
        cancel_url: `${redirectBase}/bestowals/${bestowal.id}?status=cancelled`,
      }),
    });

    if (!invoiceRes.ok) {
      const body = await invoiceRes.text();
      console.error("nowpayments invoice failed", invoiceRes.status, body);
      await service
        .from("bestowals")
        .update({ payment_status: "failed", payout_error: `invoice_failed:${invoiceRes.status}` })
        .eq("id", bestowal.id);
      return json({ error: "invoice_failed", status: invoiceRes.status, body }, 502);
    }

    const invoice = await invoiceRes.json() as {
      id?: string;
      invoice_url?: string;
      created_at?: string;
      expiration_date?: string;
    };

    await service
      .from("bestowals")
      .update({ provider_order_id: invoice.id ?? null })
      .eq("id", bestowal.id);

    return json({
      bestowalId: bestowal.id,
      invoiceId: invoice.id,
      invoiceUrl: invoice.invoice_url,
      expiresAt: invoice.expiration_date ?? null,
      breakdown: {
        baseAmount,
        processorFee,
        processorFeePct: feePct,
        buyerTotal,
        currency: "USD",
      },
    });
  } catch (err) {
    console.error("create-nowpayments-invoice error", err);
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
