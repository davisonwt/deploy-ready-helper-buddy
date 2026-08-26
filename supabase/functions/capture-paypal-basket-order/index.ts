import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { paypalFetch } from "../_shared/paypal/client.ts";

const BodySchema = z.object({ basketOrderId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "server_misconfigured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(authHeader.slice(7));
  if (authError || !authData.user) return json({ error: "unauthorized" }, 401);

  let parsed: z.infer<typeof BodySchema>;
  try {
    const result = BodySchema.safeParse(await req.json());
    if (!result.success) return json({ error: result.error.flatten().fieldErrors }, 400);
    parsed = result.data;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: order, error: orderError } = await service
    .from("basket_orders")
    .select("id, user_id, provider, provider_invoice_id, status")
    .eq("id", parsed.basketOrderId)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (orderError) return json({ error: "basket_lookup_failed" }, 500);
  if (!order) return json({ error: "basket_not_found" }, 404);
  if (order.provider !== "paypal") return json({ error: "not_paypal_order" }, 400);
  if (order.status === "completed") return json({ status: "completed" });
  if (!order.provider_invoice_id) return json({ error: "paypal_order_id_missing" }, 409);

  const capture = await paypalFetch<Record<string, unknown>>(
    `/v2/checkout/orders/${encodeURIComponent(order.provider_invoice_id)}/capture`,
    { method: "POST", body: {} },
  );

  if (!capture.ok && capture.status !== 422) {
    console.error("PayPal basket capture failed", order.id, capture.status, capture.raw);
    return json({ error: "paypal_capture_failed", status: capture.status }, 502);
  }

  // A 422 commonly means a concurrent webhook already captured the order.
  // Verify the authoritative order state before finalizing locally.
  let paid = capture.ok && String((capture.data as { status?: string })?.status ?? "").toUpperCase() === "COMPLETED";
  if (!paid) {
    const lookup = await paypalFetch<{ status?: string }>(
      `/v2/checkout/orders/${encodeURIComponent(order.provider_invoice_id)}`,
      { method: "GET" },
    );
    paid = lookup.ok && String(lookup.data?.status ?? "").toUpperCase() === "COMPLETED";
  }
  if (!paid) return json({ status: "processing" }, 202);

  const { error: finalizeError } = await service.rpc("finalize_basket_order", {
    _basket_order_id: order.id,
  });
  if (finalizeError) {
    console.error("finalize_basket_order failed after PayPal capture", order.id, finalizeError);
    return json({ error: "basket_finalize_failed" }, 500);
  }

  return json({ status: "completed" });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}