// payout-earnings — the ONE weekly payout run, replacing both
// payout-sower-earnings (daily, NOWPayments crypto rails, product_bestowals
// only) and dispatchPayouts() (immediate-dispatch at gift/orchard finalize).
// Also absorbs payout-whisperer-earnings — sower and whisperer balances now
// pay out together, one PayPal batch per run.
//
// SOURCE OF TRUTH: public.owed_payout_balances() (see the migration this
// shipped with) — unions product_bestowals/content_purchases/bestowals
// (sower_amount, completed + payout_status='pending', same source tables
// and sower-id resolution as sower_earnings_v) with whisperer_earnings
// (amount, status='payable'), grouped by the recipient's real auth user id.
//
// RULES:
//   - PayPal Payouts only. No crypto rail here anymore (Solana comes back
//     with the native crypto spec later — explicitly deferred, not this).
//   - $20 minimum per recipient. Below it, stays owed, retried next run.
//   - Requires an ACTIVE, VERIFIED PayPal email in user_wallets
//     (wallet_type='paypal_email', verified_at IS NOT NULL). No email, or
//     an unverified one, skips with a reason — never blocks the sale.
//   - PAYPAL_PAYOUTS_ENABLED must be 'true', same flag paypal-payout used.
//   - One PayPal Payouts batch call per run, covering every eligible
//     recipient (sowers and whisperers together) as separate items.
//   - One `payouts` row per recipient, sender_item_id = that row's id, so
//     the webhook can find it directly. paypal_item_id is filled in once
//     PayPal's PAYMENT.PAYOUTS-ITEM.* webhook arrives — batch creation
//     alone doesn't return real per-item ids, only the batch id.
//
// dry_run:true computes and returns the exact same eligible/skipped
// breakdown (for the admin "next run preview") without touching anything —
// no payouts rows, no covered-row status changes, no PayPal call.
//
// Auth: CRON_SECRET (Authorization: Bearer, or legacy x-cron-secret),
// service-role bearer, or an admin/gosat user session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { paypalFetch } from "../_shared/paypal/client.ts";
import { markCoveredRowsPending, markCoveredRowsProcessing, type CoveredRow } from "../_shared/payoutLedger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const MIN_PAYOUT_USD = 20;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface OwedRow {
  recipient_type: "sower" | "whisperer";
  recipient_user_id: string;
  amount_usd: number;
  covered_rows: CoveredRow[];
}

interface RecipientOutcome {
  recipient_type: "sower" | "whisperer";
  recipient_user_id: string;
  amount_usd: number;
  eligible: boolean;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
        authorized = !!roles?.some((r: any) => ["admin", "gosat"].includes(r.role));
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    // --- Load owed balances, every recipient, regardless of threshold -----
    const { data: owedRaw, error: owedErr } = await admin.rpc("owed_payout_balances");
    if (owedErr) return json({ error: "owed_lookup_failed", detail: owedErr.message }, 500);
    const owed = (owedRaw ?? []) as OwedRow[];

    const totalFloatUsd = round2(owed.reduce((s, r) => s + Number(r.amount_usd || 0), 0));

    // --- Resolve verified PayPal emails, one query for every recipient ----
    const userIds = [...new Set(owed.map((r) => r.recipient_user_id))];
    const { data: wallets } = userIds.length > 0
      ? await admin
        .from("user_wallets")
        .select("user_id, wallet_address, is_primary, updated_at")
        .in("user_id", userIds)
        .eq("wallet_type", "paypal_email")
        .eq("is_active", true)
        .not("verified_at", "is", null)
      : { data: [] as any[] };

    const emailByUser = new Map<string, string>();
    const bestByUser = new Map<string, { primary: number; updated: number }>();
    for (const w of (wallets ?? []) as any[]) {
      const score = { primary: w.is_primary ? 1 : 0, updated: w.updated_at ? new Date(w.updated_at).getTime() : 0 };
      const cur = bestByUser.get(w.user_id);
      if (!cur || score.primary > cur.primary || (score.primary === cur.primary && score.updated > cur.updated)) {
        bestByUser.set(w.user_id, score);
        emailByUser.set(w.user_id, w.wallet_address);
      }
    }

    // --- Eligibility: $20 minimum, verified PayPal email required ---------
    const outcomes: RecipientOutcome[] = owed.map((r) => {
      const amount = round2(Number(r.amount_usd || 0));
      const base = { recipient_type: r.recipient_type, recipient_user_id: r.recipient_user_id, amount_usd: amount };
      if (amount < MIN_PAYOUT_USD) return { ...base, eligible: false, reason: "below_minimum" };
      if (!emailByUser.has(r.recipient_user_id)) return { ...base, eligible: false, reason: "no_verified_paypal_email" };
      return { ...base, eligible: true };
    });

    if (dryRun) {
      return json({ dry_run: true, totalFloatUsd, recipients: outcomes });
    }

    const eligibleOwed = owed.filter((r) => {
      const amount = round2(Number(r.amount_usd || 0));
      return amount >= MIN_PAYOUT_USD && emailByUser.has(r.recipient_user_id);
    });

    if (eligibleOwed.length === 0) {
      return json({ success: true, totalFloatUsd, paid: 0, skipped: outcomes.length, outcomes });
    }

    const payoutsEnabled = (Deno.env.get("PAYPAL_PAYOUTS_ENABLED") ?? "").toLowerCase() === "true";
    if (!payoutsEnabled) {
      return json({
        success: true,
        totalFloatUsd,
        paid: 0,
        skipped: outcomes.length,
        reason: "payouts_not_enabled",
        outcomes,
      });
    }

    // --- Dispatch: one payouts row per recipient, one PayPal batch total --
    const runId = crypto.randomUUID();
    const inserts = eligibleOwed.map((r) => ({
      run_id: runId,
      recipient_type: r.recipient_type,
      recipient_user_id: r.recipient_user_id,
      amount: round2(Number(r.amount_usd)),
      currency: "USD",
      status: "processing",
      covered_rows: r.covered_rows,
    }));

    const { data: inserted, error: insErr } = await admin
      .from("payouts")
      .insert(inserts)
      .select("id, recipient_type, recipient_user_id, amount, covered_rows");
    if (insErr || !inserted) {
      return json({ error: "payouts_insert_failed", detail: insErr?.message }, 500);
    }

    // Mark covered source rows in-flight so an overlapping run can't double-pick them.
    for (const row of inserted) {
      await markCoveredRowsProcessing(admin, row.covered_rows as CoveredRow[]);
    }

    const items = inserted.map((row: any) => ({
      recipient_type: "EMAIL",
      receiver: emailByUser.get(row.recipient_user_id)!,
      sender_item_id: row.id,
      note: "Sow2Grow weekly payout",
      amount: { value: Number(row.amount).toFixed(2), currency: "USD" },
    }));

    try {
      const { ok, status, data } = await paypalFetch<{ batch_header?: { payout_batch_id?: string } }>(
        "/v1/payments/payouts",
        {
          method: "POST",
          body: {
            sender_batch_header: {
              sender_batch_id: `s2g-weekly-${runId}`,
              email_subject: "You have a Sow2Grow payout",
              email_message: "Your weekly Sow2Grow payout has been sent. Thank you for sowing.",
            },
            items,
          },
        },
      );

      if (!ok) {
        console.error("payout-earnings: paypal batch create failed", status, data);
        await admin.from("payouts").update({ status: "failed", error: `paypal_http_${status}` }).eq("run_id", runId);
        for (const row of inserted) {
          await markCoveredRowsPending(admin, row.covered_rows as CoveredRow[], `paypal_http_${status}`);
        }
        return json({ error: "paypal_batch_failed", detail: data }, 502);
      }

      const batchId = data?.batch_header?.payout_batch_id ?? null;
      await admin.from("payouts").update({ paypal_batch_id: batchId }).eq("run_id", runId);

      return json({
        success: true,
        runId,
        batchId,
        totalFloatUsd,
        paid: inserted.length,
        skipped: outcomes.length - eligibleOwed.length,
        outcomes,
      });
    } catch (err) {
      console.error("payout-earnings: paypal batch exception", err);
      const reason = err instanceof Error ? err.message : String(err);
      await admin.from("payouts").update({ status: "failed", error: reason }).eq("run_id", runId);
      for (const row of inserted) {
        await markCoveredRowsPending(admin, row.covered_rows as CoveredRow[], reason);
      }
      return json({ error: "paypal_batch_exception", detail: reason }, 500);
    }
  } catch (err) {
    console.error("payout-earnings error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
