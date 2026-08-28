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
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const STALE_HOURS = 48;

type ReconcileKind = "basket" | "content" | "gift" | "orchard" | "topup";

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

    let authorized = false;
    if (CRON_SECRET && token && token === CRON_SECRET) authorized = true;
    if (!authorized && CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) authorized = true;
    if (!authorized && token && token === SERVICE_ROLE_KEY) authorized = true;
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

    const results: Array<{ kind: string; recordId: string; paypalStatus: string; action: string }> = [];
    for (const t of targets) {
      const { ok, data } = await paypalFetch<{ status?: string }>(
        `/v2/checkout/orders/${encodeURIComponent(t.paypalOrderId)}`,
        { method: "GET" },
      );
      const paypalStatus = ok ? String(data?.status ?? "UNKNOWN").toUpperCase() : "LOOKUP_FAILED";

      if (paypalStatus === "COMPLETED") {
        try {
          await captureAndFinalize(service, t.kind, t.recordId, t.paypalOrderId);
          results.push({ kind: t.kind, recordId: t.recordId, paypalStatus, action: "finalized" });
        } catch (err) {
          console.error("reconcile: finalize failed", t.kind, t.recordId, err);
          results.push({ kind: t.kind, recordId: t.recordId, paypalStatus, action: "finalize_error" });
        }
        continue;
      }

      const ageHours = (Date.now() - new Date(t.createdAt).getTime()) / 3_600_000;
      if (ageHours >= STALE_HOURS && ok) {
        // PayPal itself confirms this is not (and isn't going to become)
        // completed -- a positive answer, not just staleness. Safe to close.
        await service.from(t.table).update({ [t.statusColumn]: "failed" }).eq("id", t.recordId);
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

  return out;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
