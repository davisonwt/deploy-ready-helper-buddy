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
import { assertRateFresh, getXrpUsdRate, usdToXrp, type XrpRateQuote } from "../_shared/xrpRate.ts";
import {
  createNowPaymentsPayout,
  payoutProvider,
  toNowPaymentsTarget,
  type PayoutNetwork,
} from "../_shared/payouts/nowpaymentsRail.ts";

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
  whisperer_id: string;
  amount_usd: number;
  earning_count: number;
  status: "paid" | "awaiting_2fa" | "skipped" | "failed";
  provider?: "nowpayments" | "hotkey";
  reason?: string;
  network?: string;
  tx?: string | null;
  /** USD per 1 XRP actually used for this payout (XRP rail only). */
  fx_rate?: number | null;
  fx_observed_at?: string | null;
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
    const amountById = new Map<string, number>();
    for (const e of earnings as any[]) {
      const cur = byWhisperer.get(e.whisperer_id) ?? { ids: [], amount: 0 };
      cur.ids.push(e.id);
      cur.amount = round2(cur.amount + Number(e.amount || 0));
      byWhisperer.set(e.whisperer_id, cur);
      amountById.set(e.id, Number(e.amount || 0));
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

    // --- One XRP/USD rate for the whole run ----------------------------------
    // Fetched ONCE (not once per whisperer) and only when someone in this batch
    // is actually on the XRP rail. If no trustworthy price can be established,
    // xrpRate stays null: every XRP payout in this run is skipped, its earnings
    // stay 'payable', and the next run tries again. We never guess a rate.
    const needsXrp = whispererIds.some((wid) => {
      const uid = userIdByWhisperer.get(wid);
      return uid ? profileByUser.get(uid)?.payout_network === "xrp" : false;
    });
    let xrpRate: XrpRateQuote | null = null;
    let xrpRateError: string | null = null;
    if (needsXrp && !dryRun) {
      try {
        xrpRate = await getXrpUsdRate();
        assertRateFresh(xrpRate.observedAt);
        console.log(
          `payout-whisperer-earnings: XRP/USD run rate ${xrpRate.rate} observed ${xrpRate.observedAt} from ${
            xrpRate.sources.map((s) => `${s.name}=${s.price}`).join(", ")
          }`,
        );
      } catch (e) {
        xrpRate = null;
        xrpRateError = e instanceof Error ? e.message : String(e);
        console.error(
          `payout-whisperer-earnings: SKIPPING ALL XRP PAYOUTS this run — no trustworthy XRP/USD price. Reason: ${xrpRateError}. Earnings remain payable and will be retried on the next run.`,
        );
      }
    }

    const provider = payoutProvider();
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

      // --- Default rail: NOWPayments Mass Payouts ---------------------------
      // Same reasoning as the sower runner: S2G keeps no hot keys, so crypto
      // leaves through NOWPayments unless PAYOUT_PROVIDER=hotkey. A created
      // batch has not moved money yet — it awaits a human 2FA verification, so
      // earnings are marked 'awaiting_2fa' rather than 'paid'.
      if (provider === "nowpayments") {
        if (network !== "solana_usdc" && network !== "xrp") {
          outcomes.push({ ...base, reason: `unsupported_payout_network:${network}`, network, provider });
          continue;
        }
        if (network === "xrp" && !dryRun && !xrpRate) {
          outcomes.push({
            ...base,
            reason: `xrp_rate_unavailable:${xrpRateError ?? "no_rate"}`,
            network,
            provider,
          });
          continue; // earnings stay 'payable' — retried next run
        }
        if (dryRun) {
          outcomes.push({ ...base, status: "skipped", reason: "dry_run", network, provider });
          continue;
        }

        const target = toNowPaymentsTarget(network as PayoutNetwork, amountUsd, xrpRate?.rate ?? null);
        if (!target) {
          outcomes.push({ ...base, reason: "payout_amount_unresolvable", network, provider });
          continue;
        }

        const np = await createNowPaymentsPayout({
          supabaseUrl: SUPABASE_URL,
          serviceRoleKey: SERVICE_ROLE_KEY,
          externalId: `whisperer_earnings:${wid}:${Date.now()}`,
          role: "whisperer",
          address: profile.payout_address,
          target,
        });

        if (np.status !== "awaiting_2fa" || !np.reference) {
          console.error("nowpayments whisperer payout not created", wid, np.error, np.raw);
          outcomes.push({
            ...base,
            status: "failed",
            network,
            provider,
            reason: np.error ?? "nowpayments_payout_not_created",
          });
          continue; // earnings stay 'payable' — retried on the next run
        }

        const npRate = network === "xrp" ? (xrpRate?.rate ?? null) : null;
        const { error: npMarkErr } = await admin
          .from("whisperer_earnings")
          .update({
            status: "awaiting_2fa",
            payout_reference: np.reference,
            payout_provider: "nowpayments",
            payout_fx_rate: npRate,
            payout_fx_observed_at: network === "xrp" ? (xrpRate?.observedAt ?? null) : null,
            payout_fx_sources: network === "xrp" ? (xrpRate?.sources ?? null) : null,
          })
          .in("id", bucket.ids);
        if (npMarkErr) {
          console.error(
            "CRITICAL: NOWPayments batch created but earnings not marked awaiting_2fa",
            wid,
            np.reference,
            npMarkErr.message,
          );
          outcomes.push({
            ...base,
            status: "failed",
            network,
            provider,
            reason: `batch_created_but_ledger_update_failed:${npMarkErr.message}`,
            tx: np.reference,
          });
          continue;
        }

        if (npRate) {
          for (const id of bucket.ids) {
            const usd = amountById.get(id) ?? 0;
            if (usd <= 0) continue;
            const { error: xrpErr } = await admin
              .from("whisperer_earnings")
              .update({ payout_amount_xrp: usdToXrp(usd, npRate) })
              .eq("id", id);
            if (xrpErr) console.error("could not record payout_amount_xrp", id, xrpErr.message);
          }
        }

        outcomes.push({
          ...base,
          status: "awaiting_2fa",
          network,
          provider,
          tx: np.reference,
          fx_rate: npRate,
          fx_observed_at: network === "xrp" ? (xrpRate?.observedAt ?? null) : null,
        });
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
        // whisperer earned plus the run-level rate, so every XRP payout in this
        // run converts at one price we actually observed and recorded.
        if (!dryRun && !xrpRate) {
          outcomes.push({
            ...base,
            reason: `xrp_rate_unavailable:${xrpRateError ?? "no_rate"}`,
            network,
          });
          continue; // earnings stay 'payable' — retried next run
        }
        fn = "send-xrp-payout";
        payload = {
          recipient_user_id: userId,
          amount_usd: amountUsd,
          reference: `whisperer_earnings:${wid}`,
          ...(xrpRate
            ? {
              fx_rate: xrpRate.rate,
              fx_observed_at: xrpRate.observedAt,
              fx_sources: xrpRate.sources,
            }
            : {}),
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

      const usedRate = network === "xrp"
        ? Number((result as any)?.fx_rate ?? xrpRate?.rate ?? 0) || null
        : null;
      const usedObservedAt = network === "xrp"
        ? ((result as any)?.fx_observed_at ?? xrpRate?.observedAt ?? null)
        : null;
      const usedSources = network === "xrp"
        ? ((result as any)?.fx_sources ?? xrpRate?.sources ?? null)
        : null;

      const { error: markErr } = await admin
        .from("whisperer_earnings")
        .update({
          status: "paid",
          processed_at: new Date().toISOString(),
          payout_provider: "hotkey",
          payout_fx_rate: usedRate,
          payout_fx_observed_at: usedObservedAt,
          payout_fx_sources: usedSources,
        })
        .in("id", bucket.ids);
      if (markErr) {
        // Money moved but the ledger did not update — loud, needs a human.
        console.error("CRITICAL: paid but could not mark earnings paid", wid, markErr.message);
        outcomes.push({ ...base, status: "failed", network, reason: `paid_but_ledger_update_failed:${markErr.message}` });
        continue;
      }

      // Per-earning XRP amount, so "$X became Y XRP" is answerable row by row.
      if (usedRate) {
        for (const id of bucket.ids) {
          const usd = amountById.get(id) ?? 0;
          if (usd <= 0) continue;
          const { error: xrpErr } = await admin
            .from("whisperer_earnings")
            .update({ payout_amount_xrp: usdToXrp(usd, usedRate) })
            .eq("id", id);
          if (xrpErr) {
            console.error("could not record payout_amount_xrp", id, xrpErr.message);
          }
        }
      }

      outcomes.push({
        ...base,
        status: "paid",
        network,
        tx: (result as any)?.signature ?? (result as any)?.tx_hash ?? null,
        fx_rate: usedRate,
        fx_observed_at: usedObservedAt,
      });
    }

    return json({
      success: true,
      provider,
      processed: outcomes.filter((o) => o.status === "paid").length,
      awaiting_2fa: outcomes.filter((o) => o.status === "awaiting_2fa").length,
      skipped: outcomes.filter((o) => o.status === "skipped").length,
      failed: outcomes.filter((o) => o.status === "failed").length,
      outcomes,
    });
  } catch (err) {
    console.error("payout-whisperer-earnings error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
