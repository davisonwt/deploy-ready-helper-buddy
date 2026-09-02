// Client-triggered PayPal capture recovery, for any of the five order kinds.
// Generalized from capture-paypal-basket-order (basket-only) once
// _shared/paypal/capture.ts made the capture-and-finalize logic reusable.
//
// Called from PaymentSuccessPage on load so completion doesn't depend
// entirely on paypal-webhook's delivery — the webhook still does the same
// capture inline on CHECKOUT.ORDER.APPROVED; this is the same safety net
// the basket flow already had, now available to all five kinds.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { captureAndFinalize, type PaypalOrderKind } from "../_shared/paypal/capture.ts";
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

const BodySchema = z.object({
  kind: z.enum(["basket", "content", "gift", "orchard", "topup", "booking"]),
  recordId: z.string().uuid(),
});

interface KindConfig {
  table: string;
  ownerColumn: string;
  statusColumn: string;
  /** Status values that mean "already finalized" — short-circuit without touching PayPal again. */
  doneValues: string[];
}

// gift and orchard bestowals are both rows in `bestowals` with identical
// columns and identical finalize behavior (see capture.ts) — there is
// nothing here that needs to tell them apart.
const KIND_CONFIG: Record<PaypalOrderKind, KindConfig> = {
  basket: { table: "basket_orders", ownerColumn: "user_id", statusColumn: "status", doneValues: ["completed"] },
  content: { table: "content_purchases", ownerColumn: "buyer_id", statusColumn: "payment_status", doneValues: ["completed"] },
  gift: { table: "bestowals", ownerColumn: "bestower_id", statusColumn: "payment_status", doneValues: ["completed", "distributed"] },
  orchard: { table: "bestowals", ownerColumn: "bestower_id", statusColumn: "payment_status", doneValues: ["completed", "distributed"] },
  topup: { table: "topups", ownerColumn: "user_id", statusColumn: "status", doneValues: ["completed"] },
  booking: { table: "bookings", ownerColumn: "grower_user_id", statusColumn: "status", doneValues: ["paid"] },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "server_misconfigured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const token = authHeader.slice(7);

  // Internal callers (admin recovery scripts) authenticate with the
  // service-role key directly, same pattern as backfill-post-finalize /
  // check-paypal-order / grove-dispatch — skips the ownership check below
  // entirely, same as the existing admin/gosat bypass already does.
  const isServiceRole = token === serviceRoleKey;
  let callerId: string | null = null;
  if (!isServiceRole) {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "unauthorized" }, 401);
    callerId = authData.user.id;
  }

  // Wallet-hardening audit item 3: rate-limited per user, fail-closed.
  // Skipped for the service-role bypass above -- that's a trusted internal
  // caller, same as the ownership check it already skips.
  if (callerId) {
    const rlService = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const rlOk = await checkRateLimit(
      rlService, callerId, RateLimitPresets.PAYMENT.limitType,
      RateLimitPresets.PAYMENT.maxAttempts, RateLimitPresets.PAYMENT.timeWindowMinutes, true,
    );
    if (!rlOk) return createRateLimitResponse(RateLimitPresets.PAYMENT.timeWindowMinutes * 60);
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    const result = BodySchema.safeParse(await req.json());
    if (!result.success) return json({ error: result.error.flatten().fieldErrors }, 400);
    parsed = result.data;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const config = KIND_CONFIG[parsed.kind];
  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const selectCols = parsed.kind === "basket"
    ? `id, ${config.ownerColumn}, provider, provider_order_id, provider_invoice_id, ${config.statusColumn}`
    : `id, ${config.ownerColumn}, provider, provider_order_id, ${config.statusColumn}`;

  const { data: order, error: orderError } = await service
    .from(config.table)
    .select(selectCols)
    .eq("id", parsed.recordId)
    .maybeSingle();

  if (orderError) return json({ error: "order_lookup_failed" }, 500);
  if (!order) return json({ error: "order_not_found" }, 404);
  const row = order as Record<string, unknown>;

  const ownerId = row[config.ownerColumn] as string | undefined;
  if (!isServiceRole && ownerId !== callerId) {
    const [{ data: isAdmin }, { data: isGosat }] = await Promise.all([
      service.rpc("has_role", { _user_id: callerId, _role: "admin" }),
      service.rpc("has_role", { _user_id: callerId, _role: "gosat" }),
    ]);
    if (!isAdmin && !isGosat) return json({ error: "forbidden" }, 403);
  }

  if (row.provider !== "paypal") return json({ error: "not_paypal_order" }, 400);

  const status = row[config.statusColumn] as string;
  if (config.doneValues.includes(status)) return json({ status: "completed" });

  // basket_orders keeps the real PayPal order id separate from
  // provider_order_id (which holds "basket:<uuid>", the custom_id string);
  // every other table stores the real PayPal order id directly in
  // provider_order_id.
  const paypalOrderId = parsed.kind === "basket"
    ? (row.provider_invoice_id as string | null)
    : (row.provider_order_id as string | null);
  if (!paypalOrderId) return json({ error: "paypal_order_id_missing" }, 409);

  let result: { completed: boolean };
  try {
    result = await captureAndFinalize(service, parsed.kind, parsed.recordId, paypalOrderId);
  } catch (err) {
    console.error("PayPal capture failed", parsed.kind, parsed.recordId, err);
    await logFunctionFailure("capture-paypal-order", err);
    return json({ error: "paypal_capture_failed", detail: err instanceof Error ? err.message : String(err) }, 502);
  }

  if (!result.completed) return json({ status: "processing" }, 202);
  return json({ status: "completed" });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
