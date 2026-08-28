// backfill-post-finalize — admin-only. Runs the post-finalize messaging step
// (_shared/postFinalize/messaging.ts) for completed orders that predate it,
// or that otherwise never got their thank-you/receipt messages.
//
// Safe to run repeatedly: deliverFinalizeMessages is already idempotent per
// (kind, recordId, sower) — it checks for an existing 'bestowal_receipt'
// message before inserting anything. This function's own "already has a
// receipt" pre-check is only a scale optimization (skip an order entirely
// once every leg it needs is confirmed present); correctness always rests
// on messaging.ts's own finer-grained per-sower check underneath.
//
// Auth: internal (service-role bearer, matching grove-dispatch's existing
// pattern) or a real admin's session (has_role 'admin'). verify_jwt is
// false so the service-role path works without Supabase's own JWT gate
// getting in the way first.
//
// Body: { orderId?: string, kind?: 'basket'|'content'|'gift'|'orchard'|'topup' }
// Omit both to backfill every completed order of all five kinds. Passing
// orderId alone requires kind too, since ids aren't unique across tables.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { deliverFinalizeMessages, type FinalizeMessagingKind } from "../_shared/postFinalize/messaging.ts";

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

interface OrderRef {
  kind: FinalizeMessagingKind;
  recordId: string;
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

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const isServiceRole = token === serviceRoleKey;
    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
      const { data: userData, error: userError } = await authClient.auth.getUser(token);
      if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

      const { data: isAdmin } = await service.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        console.warn("backfill-post-finalize: non-admin access denied", userData.user.id);
        return json({ error: "forbidden" }, 403);
      }
    }

    let payload: { orderId?: string; kind?: FinalizeMessagingKind } = {};
    try { payload = await req.json(); } catch { /* empty body is fine */ }

    if (payload.orderId && !payload.kind) {
      return json({ error: "kind_required_with_orderId" }, 400);
    }

    const targets: OrderRef[] = payload.orderId
      ? [{ kind: payload.kind!, recordId: payload.orderId }]
      : await collectCompletedOrders(service, payload.kind);

    const results: Array<{ kind: string; recordId: string; skipped: boolean }> = [];
    for (const t of targets) {
      const skipped = await alreadyHasReceipt(service, t.kind, t.recordId);
      if (!skipped) {
        await deliverFinalizeMessages(service, t.kind, t.recordId);
      }
      results.push({ kind: t.kind, recordId: t.recordId, skipped });
    }

    return json({
      processed: results.length,
      skipped: results.filter((r) => r.skipped).length,
      ran: results.filter((r) => !r.skipped).length,
      results,
    });
  } catch (err) {
    console.error("backfill-post-finalize error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function collectCompletedOrders(
  service: SupabaseLike,
  onlyKind?: FinalizeMessagingKind,
): Promise<OrderRef[]> {
  const out: OrderRef[] = [];

  if (!onlyKind || onlyKind === "basket") {
    const { data } = await service.from("basket_orders").select("id").eq("status", "completed");
    for (const r of (data ?? []) as any[]) out.push({ kind: "basket", recordId: r.id });
  }
  if (!onlyKind || onlyKind === "content") {
    const { data } = await service.from("content_purchases").select("id").eq("payment_status", "completed");
    for (const r of (data ?? []) as any[]) out.push({ kind: "content", recordId: r.id });
  }
  if (!onlyKind || onlyKind === "gift" || onlyKind === "orchard") {
    const { data } = await service
      .from("bestowals")
      .select("id, orchard_id")
      .in("payment_status", ["completed", "distributed"]);
    for (const r of (data ?? []) as any[]) {
      const kind: FinalizeMessagingKind = r.orchard_id ? "orchard" : "gift";
      if (!onlyKind || onlyKind === kind) out.push({ kind, recordId: r.id });
    }
  }
  if (!onlyKind || onlyKind === "topup") {
    const { data } = await service.from("topups").select("id").eq("status", "completed");
    for (const r of (data ?? []) as any[]) out.push({ kind: "topup", recordId: r.id });
  }

  return out;
}

/**
 * Coarse pre-check: does ANY 'bestowal_receipt' message exist for this
 * (kind, recordId) at all? A basket with multiple sowers that's only
 * partially delivered still gets re-run — deliverFinalizeMessages's own
 * per-sower check is what actually decides what (if anything) to insert.
 */
async function alreadyHasReceipt(
  service: SupabaseLike,
  kind: string,
  recordId: string,
): Promise<boolean> {
  const { data } = await service
    .from("chat_messages")
    .select("id")
    .eq("message_type", "bestowal_receipt")
    .contains("system_metadata", { source: kind, source_id: recordId })
    .limit(1)
    .maybeSingle();
  return !!data;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
