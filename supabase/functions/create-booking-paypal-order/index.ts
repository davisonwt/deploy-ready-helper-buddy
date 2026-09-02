// Create the PayPal order for an accepted Hand booking — spec-service-seeds.md
// §7 step 3. Mirrors create-basket-bestowal-order's PayPal branch, scaled
// down to a single line item.
//
// Gap closed: the buyer total now runs through computeBuyerFee exactly
// like create-basket-bestowal-order's does, so the buyer (not the sower)
// absorbs PayPal's processor cut, same as every other create-*-order
// function. bookings.processor_fee (20260829310000 migration) stores it.
// bookings.amount/s2g_fee/total are untouched by this — those stay the
// pre-processor-fee, S2G-inclusive figures finalizeBooking/syncBooking
// already use for the sower/S2G split; the processor fee is charged on
// top, exactly like basket_orders.processor_fee is on top of its own
// fee-inclusive subtotal.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { paypalFetch } from "../_shared/paypal/client.ts";
import { computeBuyerFee } from "../_shared/paypal/fees.ts";

interface RequestPayload {
  bookingId: string;
  redirectBaseUrl?: string;
}

interface PaypalOrderResponse {
  id?: string;
  status?: string;
  links?: Array<{ href: string; rel: string; method: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"];
    const serviceRoleKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"];
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    let payload: RequestPayload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!payload?.bookingId) return json({ error: "missing_booking_id" }, 400);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Never trust a client-submitted amount — re-read the booking's own
    // amount/s2g_fee/total, computed at request time from the seed's live
    // price via priceBreakdown().
    const { data: booking, error: bookingErr } = await service
      .from("bookings")
      .select("id, grower_user_id, status, total, product_id, products:product_id ( title )")
      .eq("id", payload.bookingId)
      .maybeSingle();
    if (bookingErr) {
      console.error("booking lookup failed", bookingErr);
      return json({ error: "booking_lookup_failed" }, 500);
    }
    if (!booking) return json({ error: "booking_not_found" }, 404);
    if (booking.grower_user_id !== userId) return json({ error: "forbidden" }, 403);
    if (booking.status !== "accepted") {
      return json({ error: "booking_not_accepted", status: booking.status }, 409);
    }

    const total = Number(booking.total);
    if (!Number.isFinite(total) || total <= 0) {
      return json({ error: "invalid_booking_amount" }, 400);
    }

    // Golden rule: the buyer pays the processor fee, not the sower.
    // `total` (S2G-fee-inclusive already) is the "subtotal" computeBuyerFee
    // expects — mirrors create-basket-bestowal-order's own call exactly.
    const quote = computeBuyerFee("paypal", total);
    const processorFee = quote.fee;
    const buyerCharge = quote.total;

    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!paypalClientId || !paypalSecret) {
      return json({ error: "paypal_credentials_missing" }, 500);
    }

    const redirectBase = payload.redirectBaseUrl ?? "https://sow2growapp.com";
    const productTitle = (booking as any).products?.title ?? "Hand booking";

    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: booking.id,
          custom_id: `booking:${booking.id}`,
          description: `Sow2Grow booking — ${productTitle}`.slice(0, 127),
          amount: { currency_code: "USD", value: buyerCharge.toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Sow2Grow",
            user_action: "PAY_NOW",
            landing_page: "LOGIN",
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            return_url: `${redirectBase}/payment-success?booking=${booking.id}`,
            cancel_url: `${redirectBase}/payment-cancelled?booking=${booking.id}`,
          },
        },
      },
    };

    const { ok, status, data, raw } = await paypalFetch<PaypalOrderResponse>(
      "/v2/checkout/orders",
      { method: "POST", body: orderBody },
    );
    if (!ok || !data?.id) {
      console.error("paypal create order failed", status, raw);
      return json({ error: "paypal_order_failed", status, body: raw }, 502);
    }

    const approveLink = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");

    const { error: updateErr } = await service
      .from("bookings")
      .update({ provider: "paypal", provider_order_id: data.id, processor_fee: processorFee })
      .eq("id", booking.id);
    if (updateErr) {
      console.error("booking provider_order_id write failed", updateErr);
      return json({ error: "booking_update_failed" }, 500);
    }

    return json({
      bookingId: booking.id,
      provider: "paypal",
      orderId: data.id,
      approveUrl: approveLink?.href ?? null,
      breakdown: { subtotal: total, processorFee, buyerCharge, currency: "USD" },
    });
  } catch (err) {
    console.error("create-booking-paypal-order error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
