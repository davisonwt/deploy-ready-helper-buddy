// Create a fixed-price content purchase order on NOWPayments or PayPal.
// Shape 1 of the unified payment pipeline.
//
// Flow:
//   1. Authenticate buyer.
//   2. Look up content (price, seller) per content_type.
//   3. Insert a pending content_purchases row.
//   4. Create the provider invoice/order with order_id = `content:<purchase.id>`.
//   5. Return the redirect URL.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveSowerPayout } from "../_shared/resolveSowerPayout.ts";
import { paypalFetch } from "../_shared/paypal/client.ts";
import { computeBuyerFee } from "../_shared/paypal/fees.ts";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

type ContentType =
  | "library_item"
  | "live_session_media"
  | "music_track"
  | "premium_item"
  | "premium_room_access";

type Provider = "nowpayments" | "paypal";

interface RequestPayload {
  contentType: ContentType;
  contentId: string;
  provider: Provider;
  payCurrency?: string;
  redirectBaseUrl?: string;
  // Optional type-specific context (e.g. premium_item needs roomId + itemType)
  metadata?: Record<string, unknown>;
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
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
    const buyerId = userData.user.id;

    let payload: RequestPayload;
    try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if (!payload?.contentType || !payload?.contentId || !payload?.provider) {
      return json({ error: "missing_fields", required: ["contentType","contentId","provider"] }, 400);
    }
    if (payload.provider === "nowpayments" && !payload.payCurrency) {
      return json({ error: "missing_pay_currency" }, 400);
    }

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // --- Resolve content (price, seller) per type ----------------------------
    const resolved = await resolveContent(service, payload.contentType, payload.contentId, payload.metadata ?? {});
    if ("error" in resolved) return json(resolved, resolved.status ?? 400);
    const { sellerId, basePrice, label } = resolved;

    if (buyerId === sellerId) return json({ error: "cannot_purchase_own_content" }, 400);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      return json({ error: "content_not_purchasable" }, 400);
    }

    // --- Pricing -------------------------------------------------------------
    const baseAmount = round2(basePrice);
    const feeEnv = payload.provider === "paypal" ? "PAYPAL_FEE_PCT" : "NOWPAYMENTS_FEE_PCT";
    const feePct = Number(Deno.env.get(feeEnv) ?? "0.01");
    const processorFee = ceil2(baseAmount * (Number.isFinite(feePct) ? feePct : 0.01));
    const buyerTotal = round2(baseAmount + processorFee);

    // --- Resolve seller payout wallet ----------------------------------------
    const wallet = await resolveSowerPayout(service, sellerId);
    if (!wallet) {
      return json({
        error: "no_payout_method",
        message: "Seller has no NOWPayments or PayPal payout wallet configured.",
      }, 409);
    }

    // --- Insert pending row --------------------------------------------------
    const { data: purchase, error: insertError } = await service
      .from("content_purchases")
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        content_type: payload.contentType,
        content_id: payload.contentId,
        base_amount: baseAmount,
        processor_fee_amount: processorFee,
        buyer_total_amount: buyerTotal,
        currency: "USD",
        provider: payload.provider,
        payment_status: "pending",
        payout_provider: wallet.payout_provider,
        payout_destination: wallet.wallet_address,
        payout_currency:
          wallet.payout_currency ?? (wallet.payout_provider === "paypal" ? "USD" : null),
        payout_status: "pending",
        metadata: payload.metadata ?? {},
      })
      .select("id")
      .single();
    if (insertError || !purchase) {
      console.error("content_purchases insert failed", insertError);
      return json({ error: "purchase_insert_failed", detail: insertError?.message }, 500);
    }

    const redirectBase = payload.redirectBaseUrl ?? "https://sow2growapp.com";
    const orderId = `content:${purchase.id}`;
    const description = `Sow2Grow purchase: ${label}`.slice(0, 127);

    if (payload.provider === "nowpayments") {
      const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
      if (!apiKey) {
        await failPurchase(service, purchase.id, "nowpayments_misconfigured");
        return json({ error: "nowpayments_misconfigured" }, 500);
      }
      const ipnUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;
      const invoiceRes = await fetch(`${NOWPAYMENTS_API}/invoice`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          price_amount: buyerTotal,
          price_currency: "usd",
          pay_currency: payload.payCurrency,
          order_id: orderId,
          order_description: description,
          ipn_callback_url: ipnUrl,
          success_url: `${redirectBase}/payment-success?purchase=${purchase.id}`,
          cancel_url: `${redirectBase}/payment-cancelled?purchase=${purchase.id}`,
        }),
      });
      if (!invoiceRes.ok) {
        const body = await invoiceRes.text();
        console.error("nowpayments content invoice failed", invoiceRes.status, body);
        await failPurchase(service, purchase.id, `invoice_failed:${invoiceRes.status}`);
        return json({ error: "invoice_failed", status: invoiceRes.status, body }, 502);
      }
      const invoice = await invoiceRes.json() as { id?: string; invoice_url?: string; expiration_date?: string };
      await service.from("content_purchases")
        .update({ provider_order_id: invoice.id ?? null }).eq("id", purchase.id);
      return json({
        purchaseId: purchase.id,
        provider: "nowpayments",
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoice_url,
        expiresAt: invoice.expiration_date ?? null,
        breakdown: { baseAmount, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
      });
    }

    // --- PayPal --------------------------------------------------------------
    const { ok, status, data, raw } = await paypalFetch<{
      id?: string;
      links?: Array<{ href: string; rel: string }>;
    }>("/v2/checkout/orders", {
      method: "POST",
      body: {
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: orderId,
          custom_id: orderId,
          description,
          amount: { currency_code: "USD", value: buyerTotal.toFixed(2) },
        }],
        application_context: {
          brand_name: "Sow2Grow",
          user_action: "PAY_NOW",
          return_url: `${redirectBase}/payment-success?purchase=${purchase.id}`,
          cancel_url: `${redirectBase}/payment-cancelled?purchase=${purchase.id}`,
        },
      },
    });

    if (!ok || !data?.id) {
      console.error("paypal content order failed", status, raw);
      await failPurchase(service, purchase.id, `paypal_order_failed:${status}`);
      return json({ error: "paypal_order_failed", status, body: raw }, 502);
    }
    const approveLink = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
    await service.from("content_purchases")
      .update({ provider_order_id: data.id }).eq("id", purchase.id);

    return json({
      purchaseId: purchase.id,
      provider: "paypal",
      orderId: data.id,
      approveUrl: approveLink?.href ?? null,
      breakdown: { baseAmount, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
    });
  } catch (err) {
    console.error("create-content-purchase-order error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// ----------------------------------------------------------------------------

type ResolvedContent =
  | { sellerId: string; basePrice: number; label: string }
  | { error: string; message?: string; status?: number };

async function resolveContent(
  supabase: SupabaseClient,
  contentType: ContentType,
  contentId: string,
  metadata: Record<string, unknown>,
): Promise<ResolvedContent> {
  if (contentType === "library_item") {
    const { data, error } = await supabase
      .from("s2g_library_items")
      .select("id, user_id, price, title, is_public")
      .eq("id", contentId)
      .maybeSingle();
    if (error || !data) return { error: "content_not_found", status: 404 };
    if (!data.is_public) return { error: "content_not_available", status: 403 };
    return {
      sellerId: data.user_id,
      basePrice: Number(data.price ?? 0),
      label: String(data.title ?? "Library item"),
    };
  }

  if (contentType === "premium_item") {
    const roomId = String(metadata.room_id ?? metadata.roomId ?? "");
    const itemType = String(metadata.item_type ?? metadata.itemType ?? "");
    if (!roomId || !itemType) {
      return { error: "missing_metadata", message: "premium_item requires metadata.room_id and metadata.item_type", status: 400 };
    }
    const { data: room, error } = await supabase
      .from("premium_rooms")
      .select("id, creator_id, title, documents, artwork, music")
      .eq("id", roomId)
      .maybeSingle();
    if (error || !room) return { error: "content_not_found", status: 404 };
    const bucket = itemType === "music" ? room.music
                 : itemType === "artwork" ? room.artwork
                 : room.documents;
    const items = Array.isArray(bucket) ? bucket : [];
    const item = items.find((it: any) => String(it?.id) === contentId);
    if (!item) return { error: "content_not_found", status: 404 };
    return {
      sellerId: room.creator_id,
      basePrice: Number(item.price ?? 0),
      label: `${room.title} – ${item.name ?? itemType}`,
    };
  }

  if (contentType === "premium_room_access") {
    const { data, error } = await supabase
      .from("premium_rooms")
      .select("id, creator_id, title, price")
      .eq("id", contentId)
      .maybeSingle();
    if (error || !data) return { error: "content_not_found", status: 404 };
    return {
      sellerId: data.creator_id,
      basePrice: Number(data.price ?? 0),
      label: `Room access: ${data.title ?? "Premium room"}`,
    };
  }

  if (contentType === "live_session_media") {
    const { data, error } = await supabase
      .from("live_session_media")
      .select("id, uploader_id, file_name, price_cents")
      .eq("id", contentId)
      .maybeSingle();
    if (error || !data) return { error: "content_not_found", status: 404 };
    return {
      sellerId: data.uploader_id,
      basePrice: Number(data.price_cents ?? 0) / 100,
      label: `Session media: ${data.file_name ?? "media"}`,
    };
  }

  if (contentType === "music_track") {
    const { data, error } = await supabase
      .from("dj_music_tracks")
      .select("id, track_title, price, is_public, radio_djs!inner(user_id)")
      .eq("id", contentId)
      .maybeSingle();
    if (error || !data) return { error: "content_not_found", status: 404 };
    if (data.is_public === false) return { error: "content_not_available", status: 403 };
    const sellerId = (data as any).radio_djs?.user_id;
    if (!sellerId) return { error: "content_not_found", status: 404 };
    const rawPrice = Number(data.price ?? 0);
    const basePrice = rawPrice >= 2 ? rawPrice : 2; // platform minimum
    return {
      sellerId,
      basePrice,
      label: `Music: ${data.track_title ?? "track"}`,
    };
  }

  return { error: "unsupported_content_type", status: 400 };
}

async function failPurchase(supabase: SupabaseClient, id: string, reason: string) {
  await supabase.from("content_purchases")
    .update({ payment_status: "failed", payout_error: reason })
    .eq("id", id);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }
function ceil2(n: number): number  { return Math.ceil((n - Number.EPSILON) * 100) / 100; }
