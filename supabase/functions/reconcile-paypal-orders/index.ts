// reconcile-paypal-orders — scheduled every 15 minutes (see the
// 20260829130000 migration). Sweeps every basket_orders/content_purchases/
// bestowals/topups row with provider = 'paypal' still pending/processing, checks
// PayPal's own order status directly, and finalizes anything PayPal
// confirms COMPLETED that our own system never captured/finalized.
//
// Root problem this exists for: the previous safety net (a buyer's browser
// hitting /payment-success -> capture-paypal-order) only runs if the buyer's
// browser actually gets there. If it doesn't (closed tab, network drop,
// abandoned-then-paid-anyway), or if that call fails for an unrelated
// reason (as happened live on 2026-08-26 -- see SESSION-STATE.md), a
// genuinely-captured PayPal payment could sit unfinalized until
// expire_stale_orders marked it 'expired', even though the buyer's money
// had already moved. expire_stale_orders (as of this migration) now skips
// any paypal row with a real provider order id — this function is what's
// actually responsible for those, running far more often than the 48h
// staleness window so a stuck order gets caught quickly instead of by luck.
//
// A row PayPal confirms is NOT completed (and old enough — same 48h
// threshold expire_stale_orders used) is marked 'failed' here directly,
// since we've now positively confirmed with PayPal rather than just
// assumed staleness.
//
// A GET 404 (PayPal's own "this resource doesn't exist" answer) is a
// different case from a generic lookup failure — found live 2026-08-28/29,
// basket_orders 70f28cf8-... got a genuine 404 on every single 15-minute
// check and was never closed, since a 404 isn't `ok` and so never satisfied
// the "positively confirmed" rule above. Each consecutive 404 is now
// recorded in paypal_reconcile_misses; once a row has 3 in a row *and* is
// past the same 48h threshold, it's closed as 'failed' with
// resolved_reason = 'paypal_order_not_found'. Any non-404 result (ok or
// not) breaks the streak and clears the row — a transient miss on its own
// carries no meaning; three straight positive "doesn't exist" answers do.
//
// Auth: CRON_SECRET (Authorization: Bearer, or legacy x-cron-secret),
// service-role bearer, or an admin/gosat user session — same pattern as
// release-escrow / payout-sower-earnings.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { paypalFetch } from "../_shared/paypal/client.ts";
import { captureAndFinalize } from "../_shared/paypal/capture.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] ?? "";
const SERVICE_ROLE_KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const STALE_HOURS = 48;
const MISS_THRESHOLD = 3;

type ReconcileKind = "basket" | "content" | "gift" | "orchard" | "topup" | "booking";

interface Target {
  kind: ReconcileKind;
  table: string;
  recordId: string;
  paypalOrderId: string;
  createdAt: string;
  statusColumn: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    // apikey header carries the service-role key (not a JWT under new-style
    // keys) -- Authorization stays reserved for a real user session.
    const apikeyHeader = req.headers.get("apikey") ?? "";

    let authorized = false;
    if (CRON_SECRET && token && token === CRON_SECRET) authorized = true;
    if (!authorized && CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) authorized = true;
    if (!authorized && apikeyHeader && apikeyHeader === SERVICE_ROLE_KEY) authorized = true;
    if (!authorized && token) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
        authorized = !!roles?.some((r: any) => ["admin", "gosat"].includes(r.role));
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const targets = await collectTargets(service);

    const results: Array<{ kind: string; recordId: string; paypalStatus: string; action: string; missCount?: number }> = [];
    for (const t of targets) {
      const { ok, status: httpStatus, data } = await paypalFetch<{ status?: string }>(
        `/v2/checkout/orders/${encodeURIComponent(t.paypalOrderId)}`,
        { method: "GET" },
      );
      const paypalStatus = ok ? String(data?.status ?? "UNKNOWN").toUpperCase() : "LOOKUP_FAILED";

      if (paypalStatus === "COMPLETED") {
        try {
          await captureAndFinalize(service, t.kind, t.recordId, t.paypalOrderId);
          await clearMiss(service, t.table, t.recordId);
          results.push({ kind: t.kind, recordId: t.recordId, paypalStatus, action: "finalized" });
        } catch (err) {
          console.error("reconcile: finalize failed", t.kind, t.recordId, err);
          results.push({ kind: t.kind, recordId: t.recordId, paypalStatus, action: "finalize_error" });
        }
        continue;
      }

      const ageHours = (Date.now() - new Date(t.createdAt).getTime()) / 3_600_000;

      if (httpStatus === 404) {
        const missCount = await recordMiss(service, t.kind, t.table, t.recordId, httpStatus);
        if (missCount >= MISS_THRESHOLD && ageHours >= STALE_HOURS) {
          await markOrderFailed(service, t);
          await resolveMiss(service, t.table, t.recordId, "paypal_order_not_found");
          results.push({ kind: t.kind, recordId: t.recordId, paypalStatus, action: "marked_failed_not_found", missCount });
        } else {
          results.push({ kind: t.kind, recordId: t.recordId, paypalStatus, action: "left_pending", missCount });
        }
        continue;
      }

      // Not a 404 — any prior consecutive-404 streak is broken.
      await clearMiss(service, t.table, t.recordId);

      if (ageHours >= STALE_HOURS && ok) {
        // PayPal itself confirms this is not (and isn't going to become)
        // completed -- a positive answer, not just staleness. Safe to close.
        await markOrderFailed(service, t);
        results.push({ kind: t.kind, recordId: t.recordId, paypalStatus, action: "marked_failed" });
      } else {
        results.push({ kind: t.kind, recordId: t.recordId, paypalStatus, action: "left_pending" });
      }
    }

    return json({ checked: targets.length, results });
  } catch (err) {
    console.error("reconcile-paypal-orders error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function collectTargets(service: ReturnType<typeof createClient>): Promise<Target[]> {
  const out: Target[] = [];

  const { data: baskets } = await service
    .from("basket_orders")
    .select("id, provider_invoice_id, created_at")
    .eq("provider", "paypal")
    .in("status", ["pending", "processing"])
    .not("provider_invoice_id", "is", null);
  for (const r of (baskets ?? []) as any[]) {
    out.push({ kind: "basket", table: "basket_orders", recordId: r.id, paypalOrderId: r.provider_invoice_id, createdAt: r.created_at, statusColumn: "status" });
  }

  const { data: contents } = await service
    .from("content_purchases")
    .select("id, provider_order_id, created_at")
    .eq("provider", "paypal")
    .in("payment_status", ["pending", "processing"])
    .not("provider_order_id", "is", null);
  for (const r of (contents ?? []) as any[]) {
    out.push({ kind: "content", table: "content_purchases", recordId: r.id, paypalOrderId: r.provider_order_id, createdAt: r.created_at, statusColumn: "payment_status" });
  }

  const { data: bestowals } = await service
    .from("bestowals")
    .select("id, orchard_id, provider_order_id, created_at")
    .eq("provider", "paypal")
    .in("payment_status", ["pending", "processing"])
    .not("provider_order_id", "is", null);
  for (const r of (bestowals ?? []) as any[]) {
    out.push({
      kind: r.orchard_id ? "orchard" : "gift",
      table: "bestowals",
      recordId: r.id,
      paypalOrderId: r.provider_order_id,
      createdAt: r.created_at,
      statusColumn: "payment_status",
    });
  }

  const { data: topups } = await service
    .from("topups")
    .select("id, provider_order_id, created_at")
    .eq("provider", "paypal")
    .in("status", ["pending", "processing"])
    .not("provider_order_id", "is", null);
  for (const r of (topups ?? []) as any[]) {
    out.push({ kind: "topup", table: "topups", recordId: r.id, paypalOrderId: r.provider_order_id, createdAt: r.created_at, statusColumn: "status" });
  }

  // Bookings has no 'processing' status (see paypal-webhook's markProcessing
  // comment) — a payment-pending booking sits at 'accepted' the whole time,
  // so that's the one status value to sweep here, not pending/processing.
  const { data: bookings } = await service
    .from("bookings")
    .select("id, provider_order_id, created_at")
    .eq("provider", "paypal")
    .eq("status", "accepted")
    .not("provider_order_id", "is", null);
  for (const r of (bookings ?? []) as any[]) {
    out.push({ kind: "booking", table: "bookings", recordId: r.id, paypalOrderId: r.provider_order_id, createdAt: r.created_at, statusColumn: "status" });
  }

  return out;
}

/**
 * Closes a genuinely-failed order — except bookings.status has no 'failed'
 * value in its CHECK constraint (requested|accepted|declined|expired|paid|
 * cancelled), unlike every other table this sweeps. A booking's payment
 * genuinely not going anywhere is left at 'accepted' instead — the grower
 * can just retry Pay — matching the same choice paypal-webhook's markFailed
 * already made for the exact same reason.
 */
async function markOrderFailed(service: ReturnType<typeof createClient>, t: Target): Promise<void> {
  if (t.kind === "booking") {
    console.warn("reconcile: booking payment not completed, left as 'accepted' for retry", t.recordId);
    return;
  }
  await service.from(t.table).update({ [t.statusColumn]: "failed" }).eq("id", t.recordId);
}

/** Increments (or starts) the consecutive-404 streak for this row; returns the new count. */
async function recordMiss(
  service: ReturnType<typeof createClient>,
  kind: string,
  table: string,
  recordId: string,
  statusCode: number,
): Promise<number> {
  const { data: existing } = await service
    .from("paypal_reconcile_misses")
    .select("id, miss_count")
    .eq("table_name", table)
    .eq("record_id", recordId)
    .maybeSingle();

  if (existing) {
    const newCount = (existing as any).miss_count + 1;
    await service
      .from("paypal_reconcile_misses")
      .update({ miss_count: newCount, last_status_code: statusCode, last_checked_at: new Date().toISOString() })
      .eq("id", (existing as any).id);
    return newCount;
  }

  await service.from("paypal_reconcile_misses").insert({
    kind, table_name: table, record_id: recordId, miss_count: 1, last_status_code: statusCode,
  });
  return 1;
}

/** Breaks a consecutive-404 streak — a transient/mixed result on its own carries no meaning. */
async function clearMiss(service: ReturnType<typeof createClient>, table: string, recordId: string): Promise<void> {
  await service.from("paypal_reconcile_misses").delete().eq("table_name", table).eq("record_id", recordId);
}

/** Stamps the miss row once the 3-strikes rule actually closes an order out. */
async function resolveMiss(
  service: ReturnType<typeof createClient>,
  table: string,
  recordId: string,
  reason: string,
): Promise<void> {
  await service
    .from("paypal_reconcile_misses")
    .update({ resolved_at: new Date().toISOString(), resolved_reason: reason })
    .eq("table_name", table)
    .eq("record_id", recordId);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
