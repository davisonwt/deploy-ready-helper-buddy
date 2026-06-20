// Create a payment-first basket bestowal order.
// The basket can contain multiple products from multiple sowers paid in one
// buyer transaction (NOWPayments invoice OR PayPal order).
//
// SECURITY: No product_bestowals rows are created here. The basket_orders row
// holds a server-side snapshot of items + prices. The webhook handlers
// (nowpayments-webhook / paypal-webhook) call public.finalize_basket_order
// after the processor confirms payment — that RPC is the only place that
// actually creates product_bestowals rows.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { paypalFetch } from "../_shared/paypal/client.ts";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

interface RequestItem {
  productId: string;
  qty?: number;
}

interface RequestPayload {
  items: RequestItem[];
  provider: "nowpayments" | "paypal";
  payCurrency?: string;
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
    const userId = userData.user.id;

    let payload: RequestPayload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!payload?.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return json({ error: "empty_basket" }, 400);
    }
    if (payload.provider !== "nowpayments" && payload.provider !== "paypal") {
      return json({ error: "invalid_provider" }, 400);
    }
    if (payload.provider === "nowpayments" && !payload.payCurrency) {
      return json({ error: "missing_pay_currency" }, 400);
    }

    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // --- Resolve products server-side (never trust client price) -------------
    const productIds = Array.from(
      new Set(payload.items.map((i) => i.productId).filter(Boolean)),
    );
    if (productIds.length === 0) {
      return json({ error: "empty_basket" }, 400);
    }

    const { data: products, error: productsErr } = await service
      .from("products")
      .select("id, title, price, sower_id, status")
      .in("id", productIds);
    if (productsErr || !products) {
      console.error("products lookup failed", productsErr);
      return json({ error: "products_lookup_failed" }, 500);
    }
    const byId = new Map(products.map((p) => [p.id, p]));

    const itemSnapshot: Array<{
      product_id: string;
      sower_id: string | null;
      title: string;
      unit_price: number;
      qty: number;
      line_total: number;
    }> = [];

    let subtotal = 0;
    for (const item of payload.items) {
      const p = byId.get(item.productId);
      if (!p) return json({ error: "product_not_found", productId: item.productId }, 404);
      const unitPrice = Number(p.price);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return json({ error: "product_price_invalid", productId: item.productId }, 400);
      }
      const qty = Math.max(1, Math.floor(Number(item.qty ?? 1)));
      const lineTotal = round2(unitPrice * qty);
      subtotal = round2(subtotal + lineTotal);
      itemSnapshot.push({
        product_id: p.id,
        sower_id: (p as any).sower_id ?? null,
        title: p.title,
        unit_price: unitPrice,
        qty,
        line_total: lineTotal,
      });
    }

    // --- Processor fee on top (paid by buyer) --------------------------------
    const feeEnvKey = payload.provider === "nowpayments" ? "NOWPAYMENTS_FEE_PCT" : "PAYPAL_FEE_PCT";
    const feePct = Number(Deno.env.get(feeEnvKey) ?? "0.01");
    const processorFee = ceil2(subtotal * (Number.isFinite(feePct) ? feePct : 0.01));
    const buyerTotal = round2(subtotal + processorFee);

    // --- Insert basket_orders row (snapshot before calling processor) --------
    const { data: order, error: insertError } = await service
      .from("basket_orders")
      .insert({
        user_id: userId,
        provider: payload.provider,
        pay_currency: payload.payCurrency ?? null,
        subtotal,
        processor_fee: processorFee,
        buyer_total: buyerTotal,
        currency: "USD",
        status: "pending",
        items: itemSnapshot,
      })
      .select("id")
      .single();
    if (insertError || !order) {
      console.error("basket_orders insert failed", insertError);
      return json({ error: "basket_order_insert_failed", detail: insertError?.message }, 500);
    }

    const orderRef = `basket:${order.id}`;
    const redirectBase = payload.redirectBaseUrl ?? "https://sow2growapp.com";

    // --- Provider branch ------------------------------------------------------
    if (payload.provider === "nowpayments") {
      const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
      if (!apiKey) {
        await markFailed(service, order.id, "nowpayments_api_key_missing");
        return json({ error: "server_misconfigured" }, 500);
      }
      const ipnUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;
      const invoiceRes = await fetch(`${NOWPAYMENTS_API}/invoice`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          price_amount: buyerTotal,
          price_currency: "usd",
          pay_currency: payload.payCurrency,
          order_id: orderRef,
          order_description: `Sow2Grow basket (${itemSnapshot.length} item${itemSnapshot.length === 1 ? "" : "s"})`,
          ipn_callback_url: ipnUrl,
          success_url: `${redirectBase}/payment-success?basket=${order.id}`,
          cancel_url: `${redirectBase}/payment-cancelled?basket=${order.id}`,
        }),
      });
      if (!invoiceRes.ok) {
        const body = await invoiceRes.text();
        console.error("nowpayments invoice failed", invoiceRes.status, body);
        await markFailed(service, order.id, `invoice_failed:${invoiceRes.status}`);
        return json({ error: "invoice_failed", status: invoiceRes.status, body }, 502);
      }
      const invoice = await invoiceRes.json() as {
        id?: string; invoice_url?: string; expiration_date?: string;
      };
      await service
        .from("basket_orders")
        .update({
          provider_order_id: orderRef,
          provider_invoice_id: invoice.id ?? null,
          approve_url: invoice.invoice_url ?? null,
        })
        .eq("id", order.id);

      return json({
        basketOrderId: order.id,
        provider: "nowpayments",
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoice_url,
        expiresAt: invoice.expiration_date ?? null,
        breakdown: { subtotal, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
      });
    }

    // --- PayPal ---------------------------------------------------------------
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!paypalClientId || !paypalSecret) {
      await markFailed(service, order.id, "paypal_credentials_missing");
      return json({ error: "paypal_credentials_missing" }, 500);
    }

    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: order.id,
          custom_id: orderRef, // basket:<uuid>
          description: `Sow2Grow basket (${itemSnapshot.length} item${itemSnapshot.length === 1 ? "" : "s"})`.slice(0, 127),
          amount: { currency_code: "USD", value: buyerTotal.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: "Sow2Grow",
        user_action: "PAY_NOW",
        return_url: `${redirectBase}/payment-success?basket=${order.id}`,
        cancel_url: `${redirectBase}/payment-cancelled?basket=${order.id}`,
      },
    };

    const { ok, status, data, raw } = await paypalFetch<PaypalOrderResponse>(
      "/v2/checkout/orders",
      { method: "POST", body: orderBody },
    );
    if (!ok || !data?.id) {
      console.error("paypal create order failed", status, raw);
      await markFailed(service, order.id, `paypal_order_failed:${status}`);
      return json({ error: "paypal_order_failed", status, body: raw }, 502);
    }

    const approveLink = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
    await service
      .from("basket_orders")
      .update({
        provider_order_id: orderRef,
        provider_invoice_id: data.id,
        approve_url: approveLink?.href ?? null,
      })
      .eq("id", order.id);

    return json({
      basketOrderId: order.id,
      provider: "paypal",
      orderId: data.id,
      approveUrl: approveLink?.href ?? null,
      breakdown: { subtotal, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
    });
  } catch (err) {
    console.error("create-basket-bestowal-order error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function markFailed(service: any, id: string, reason: string) {
  try {
    await service.from("basket_orders").update({ status: "failed" }).eq("id", id);
  } catch (e) {
    console.error("markFailed update error", reason, e);
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
function ceil2(n: number): number {
  return Math.ceil((n - Number.EPSILON) * 100) / 100;
}
