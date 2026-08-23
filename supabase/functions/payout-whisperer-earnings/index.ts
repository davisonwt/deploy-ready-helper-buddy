// Pays out whisperer commissions that are already earned and payable.
//
// SOURCE OF TRUTH: public.whisperer_earnings rows with status = 'payable'.
// Those rows are written by finalize_basket_order ONLY after the buyer's
// payment is confirmed and only for an ACTIVE (sower-approved) assignment.
//
// PAYOUT CONFIG: whisperers use the SAME profile-level payout configuration as
// sowers (profiles.payout_network / payout_address / payout_tag /
// payout_wallet_type). The legacy whisperer_payout_wallets table is retired and
// is intentionally NOT read here — one person, one payout setup.
//
// NEVER BLOCKS A SALE: a whisperer with no payout method configured simply
// keeps their earnings in the pending ('payable') balance. They are skipped,
// reported back, and picked up automatically on the next run.
//
// IRREVERSIBILITY: this function moves real funds on-chain via the existing
// send-solana-usdc-payout / send-xrp-payout functions, which carry their own
// address validation, testnet default and audit logging. Nothing here bypasses
// those checks.
//
// Caller must be an admin/gosat user, or the service role.
// Body: { whisperer_id?: string, dry_run?: boolean, max_whisperers?: number }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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
  whisperer_id: string;
  amount_usd: number;
  earning_count: number;
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
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice(7).trim();

    if (token !== SERVICE_ROLE_KEY) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: "unauthorized" }, 401);
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!roles?.some((r: any) => ["admin", "gosat"].includes(r.role))) {
        return json({ error: "forbidden" }, 403);
      }
    }

    const body = await req.json().catch(() => ({}));
    const onlyWhisperer: string | null = typeof body?.whisperer_id === "string" ? body.whisperer_id : null;
    const dryRun = body?.dry_run === true;
    const maxWhisperers = Math.min(Math.max(Number(body?.max_whisperers ?? 25), 1), 100);

    // --- Load payable earnings ------------------------------------------------
    let q = admin
      .from("whisperer_earnings")
      .select("id, whisperer_id, amount")
      .eq("status", "payable")
      .limit(1000);
    if (onlyWhisperer) q = q.eq("whisperer_id", onlyWhisperer);
    const { data: earnings, error: earningsErr } = await q;
    if (earningsErr) return json({ error: "earnings_lookup_failed", detail: earningsErr.message }, 500);
    if (!earnings || earnings.length === 0) {
      return json({ success: true, processed: 0, outcomes: [] as Outcome[] });
    }

    const byWhisperer = new Map<string, { ids: string[]; amount: number }>();
    for (const e of earnings as any[]) {
      const cur = byWhisperer.get(e.whisperer_id) ?? { ids: [], amount: 0 };
      cur.ids.push(e.id);
      cur.amount = round2(cur.amount + Number(e.amount || 0));
      byWhisperer.set(e.whisperer_id, cur);
    }

    const whispererIds = Array.from(byWhisperer.keys()).slice(0, maxWhisperers);
    const { data: whisperers } = await admin
      .from("whisperers")
      .select("id, user_id, display_name")
      .in("id", whispererIds);
    const userIdByWhisperer = new Map(
      (whisperers ?? []).map((w: any) => [w.id, w.user_id as string | null]),
    );

    const userIds = Array.from(userIdByWhisperer.values()).filter(Boolean) as string[];
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, payout_network, payout_address, payout_tag, payout_wallet_type")
      .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileByUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    const xrpUsdRate = Number(Deno.env.get("XRP_USD_RATE") ?? "");

    const outcomes: Outcome[] = [];

    for (const wid of whispererIds) {
      const bucket = byWhisperer.get(wid)!;
      const amountUsd = round2(bucket.amount);
      const base: Outcome = { whisperer_id: wid, amount_usd: amountUsd, earning_count: bucket.ids.length, status: "skipped" };

      if (amountUsd <= 0) {
        outcomes.push({ ...base, reason: "zero_amount" });
        continue;
      }

      const userId = userIdByWhisperer.get(wid);
      if (!userId) {
        outcomes.push({ ...base, reason: "whisperer_has_no_user" });
        continue;
      }

      const profile = profileByUser.get(userId);
      const network = profile?.payout_network ?? null;
      if (!profile?.payout_address || !network) {
        // Pending balance — nothing fails, nothing is lost.
        outcomes.push({ ...base, reason: "no_payout_method_configured" });
        continue;
      }

      let fn: string;
      let payload: Record<string, unknown>;
      if (network === "solana_usdc") {
        fn = "send-solana-usdc-payout";
        payload = {
          recipient_user_id: userId,
          amount: amountUsd, // USDC is 1:1 with the USD ledger amount
          reference: `whisperer_earnings:${wid}`,
        };
      } else if (network === "xrp") {
        // XRP is a rail, not a unit of account: we hand the sender the USD the
        // whisperer earned and it converts at the live rate at send time, so
        // they always receive the full dollar value regardless of price moves.
        fn = "send-xrp-payout";
        payload = {
          recipient_user_id: userId,
          amount_usd: amountUsd,
          reference: `whisperer_earnings:${wid}`,
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
        console.error("whisperer payout failed", wid, res.status, result);
        outcomes.push({
          ...base,
          status: "failed",
          network,
          reason: (result as any)?.error ?? `send_failed:${res.status}`,
        });
        continue; // earnings stay 'payable' — retried on the next run
      }

      const { error: markErr } = await admin
        .from("whisperer_earnings")
        .update({ status: "paid", processed_at: new Date().toISOString() })
        .in("id", bucket.ids);
      if (markErr) {
        // Money moved but the ledger did not update — loud, needs a human.
        console.error("CRITICAL: paid but could not mark earnings paid", wid, markErr.message);
        outcomes.push({ ...base, status: "failed", network, reason: `paid_but_ledger_update_failed:${markErr.message}` });
        continue;
      }

      outcomes.push({
        ...base,
        status: "paid",
        network,
        tx: (result as any)?.signature ?? (result as any)?.tx_hash ?? null,
      });
    }

    return json({
      success: true,
      processed: outcomes.filter((o) => o.status === "paid").length,
      skipped: outcomes.filter((o) => o.status === "skipped").length,
      failed: outcomes.filter((o) => o.status === "failed").length,
      outcomes,
    });
  } catch (err) {
    console.error("payout-whisperer-earnings error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
