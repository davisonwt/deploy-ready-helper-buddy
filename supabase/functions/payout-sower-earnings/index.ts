// Pays out sower earnings that are RELEASED from escrow and not yet paid.
//
// SOURCE OF TRUTH: public.product_bestowals rows with
//   status = 'completed' AND release_status = 'released' AND payout_status = 'pending'.
// Digital seeds are released the moment payment confirms; physical seeds only
// after delivery confirmation / auto-release. So this function can never pay a
// sower for goods still in transit.
//
// SPLIT: the 15% S2G fee and any whisperer commission were already deducted
// when the bestowal row was written (finalize_basket_order). Here we only ever
// send `sower_amount`. Whisperer money is sent by payout-whisperer-earnings.
//
// PAYOUT CONFIG: profiles.payout_network / payout_address / payout_tag.
// NEVER BLOCKS A SALE: a sower with no payout method keeps a pending balance,
// is skipped, reported back and picked up on the next run.
//
// Caller must be admin/gosat, the service role, or carry CRON_SECRET.
// Body: { sower_id?: string, dry_run?: boolean, max_sowers?: number }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assertRateFresh, getXrpUsdRate, usdToXrp, type XrpRateQuote } from "../_shared/xrpRate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

interface Outcome {
  sower_id: string;
  amount_usd: number;
  bestowal_count: number;
  status: "paid" | "skipped" | "failed";
  reason?: string;
  network?: string;
  tx?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

    let authorized = false;
    if (CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) authorized = true;
    if (!authorized && token && token === SERVICE_ROLE_KEY) authorized = true;
    if (!authorized && token) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
        authorized = !!roles?.some((r: any) => ["admin", "gosat"].includes(r.role));
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const onlySower: string | null = typeof body?.sower_id === "string" ? body.sower_id : null;
    const dryRun = body?.dry_run === true;
    const maxSowers = Math.min(Math.max(Number(body?.max_sowers ?? 25), 1), 100);

    // --- Load released, unpaid earnings --------------------------------------
    let q = admin
      .from("product_bestowals")
      .select("id, sower_id, sower_amount")
      .eq("status", "completed")
      .eq("release_status", "released")
      .eq("payout_status", "pending")
      .limit(1000);
    if (onlySower) q = q.eq("sower_id", onlySower);

    const { data: rows, error: rowsErr } = await q;
    if (rowsErr) return json({ error: "earnings_lookup_failed", detail: rowsErr.message }, 500);
    if (!rows || rows.length === 0) {
      return json({ success: true, processed: 0, outcomes: [] as Outcome[] });
    }

    const bySower = new Map<string, { ids: string[]; amount: number }>();
    for (const r of rows as any[]) {
      if (!r.sower_id) continue;
      const cur = bySower.get(r.sower_id) ?? { ids: [], amount: 0 };
      cur.ids.push(r.id);
      cur.amount = round2(cur.amount + Number(r.sower_amount || 0));
      bySower.set(r.sower_id, cur);
    }

    const sowerIds = Array.from(bySower.keys()).slice(0, maxSowers);
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, payout_network, payout_address, payout_tag")
      .in("user_id", sowerIds.length > 0 ? sowerIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileByUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    const outcomes: Outcome[] = [];

    for (const sid of sowerIds) {
      const bucket = bySower.get(sid)!;
      const amountUsd = round2(bucket.amount);
      const base: Outcome = {
        sower_id: sid,
        amount_usd: amountUsd,
        bestowal_count: bucket.ids.length,
        status: "skipped",
      };

      if (amountUsd <= 0) {
        outcomes.push({ ...base, reason: "zero_amount" });
        continue;
      }

      const profile = profileByUser.get(sid);
      const network = profile?.payout_network ?? null;
      if (!profile?.payout_address || !network) {
        outcomes.push({ ...base, reason: "no_payout_method_configured" });
        continue;
      }

      let fn: string;
      let payload: Record<string, unknown>;
      if (network === "solana_usdc") {
        fn = "send-solana-usdc-payout";
        payload = {
          recipient_user_id: sid,
          amount: amountUsd, // USDC is 1:1 with the USD ledger amount
          reference: `sower_earnings:${sid}`,
        };
      } else if (network === "xrp") {
        // XRP is a rail, not a unit of account — the USD value converts at the
        // live rate at send time so the sower receives the full dollar amount.
        fn = "send-xrp-payout";
        payload = {
          recipient_user_id: sid,
          amount_usd: amountUsd,
          reference: `sower_earnings:${sid}`,
        };
      } else {
        outcomes.push({ ...base, reason: `unsupported_payout_network:${network}`, network });
        continue;
      }

      if (dryRun) {
        outcomes.push({ ...base, status: "skipped", reason: "dry_run", network });
        continue;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("sower payout failed", sid, res.status, result);
        outcomes.push({
          ...base,
          status: "failed",
          network,
          reason: (result as any)?.error ?? `send_failed:${res.status}`,
        });
        continue; // stays pending — retried on the next run
      }

      const tx = (result as any)?.signature ?? (result as any)?.tx_hash ?? null;

      const { error: markErr } = await admin
        .from("product_bestowals")
        .update({ payout_status: "paid", paid_at: new Date().toISOString(), payout_reference: tx })
        .in("id", bucket.ids);
      if (markErr) {
        console.error("CRITICAL: paid but could not mark bestowals paid", sid, markErr.message);
        outcomes.push({
          ...base,
          status: "failed",
          network,
          reason: `paid_but_ledger_update_failed:${markErr.message}`,
        });
        continue;
      }

      outcomes.push({ ...base, status: "paid", network, tx });
    }

    return json({
      success: true,
      processed: outcomes.filter((o) => o.status === "paid").length,
      skipped: outcomes.filter((o) => o.status === "skipped").length,
      failed: outcomes.filter((o) => o.status === "failed").length,
      outcomes,
    });
  } catch (err) {
    console.error("payout-sower-earnings error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
