// Create a direct-Solana orchard bestowal order. Mirrors
// create-nowpayments-invoice's orchard-resolution and pricing exactly
// (same pocket_price handling, same "no gross-up here" note -- see below),
// but creates a solana_payment_intents row instead of a NOWPayments
// invoice. Replaces create-nowpayments-invoice for orchard bestowals;
// that function's code stays in place, unreachable, per the migration
// order in spec-payments.md section 6.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildDistributionData } from "../_shared/distribution.ts";
import { resolveSowerPayout } from "../_shared/resolveSowerPayout.ts";
import { computeBuyerFee } from "../_shared/paypal/fees.ts";
import { createSolanaIntent } from "../_shared/solanaPayIn.ts";

interface RequestPayload {
  orchardId: string;
  pocketsCount: number;
  message?: string;
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
      return json({ error: "missing_fields", required: ["orchardId", "pocketsCount"] }, 400);
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

    // No S2G gross-up here -- orchards.pocket_price can already be
    // fee-inclusive at orchard-creation time. See the identical note in
    // create-nowpayments-invoice; unchanged here, same reasoning applies.
    const quote = computeBuyerFee("solana", baseAmount);
    const processorFee = quote.fee;
    const buyerTotal = quote.total;

    // --- Resolve sower's preferred payout wallet (shared deterministic resolver) ---
    const wallet = await resolveSowerPayout(service, orchard.user_id);
    if (!wallet) {
      return json({ error: "no_payout_method", message: "Sower has no crypto or PayPal payout wallet configured." }, 409);
    }
    const payoutProvider = wallet.payout_provider;

    // --- Build distribution snapshot (uses existing helper) ------------------
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

    // --- Insert bestowals row (provider snapshot lives here) -----------------
    const { data: bestowal, error: insertError } = await service
      .from("bestowals")
      .insert({
        orchard_id: orchard.id,
        bestower_id: userData.user.id,
        amount: buyerTotal,
        currency,
        pockets_count: payload.pocketsCount,
        message: payload.message ?? null,
        payment_method: "solana",
        payment_status: "pending",
        distribution_data: distribution,
        provider: "solana",
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

    // --- Create the Solana payment intent -------------------------------------
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
      await service.from("bestowals")
        .update({ payment_status: "failed", payout_error: "solana_intent_failed" })
        .eq("id", bestowal.id);
      return json({ error: "solana_intent_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
    }
    await service.from("bestowals")
      .update({ provider_order_id: solanaPayment.intentId })
      .eq("id", bestowal.id);

    return json({
      bestowalId: bestowal.id,
      provider: "solana",
      solanaPayment,
      breakdown: {
        baseAmount,
        processorFee,
        processorFeePct: 0,
        buyerTotal,
        currency: "USD",
      },
    });
  } catch (err) {
    console.error("create-solana-bestowal-order error", err);
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
