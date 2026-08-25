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
  sower_id: string;
  amount_usd: number;
  bestowal_count: number;
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
    const amountById = new Map<string, number>();
    for (const r of rows as any[]) {
      if (!r.sower_id) continue;
      const cur = bySower.get(r.sower_id) ?? { ids: [], amount: 0 };
      cur.ids.push(r.id);
      cur.amount = round2(cur.amount + Number(r.sower_amount || 0));
      bySower.set(r.sower_id, cur);
      amountById.set(r.id, Number(r.sower_amount || 0));
    }

    const sowerIds = Array.from(bySower.keys()).slice(0, maxSowers);
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, payout_network, payout_address, payout_tag")
      .in("user_id", sowerIds.length > 0 ? sowerIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileByUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    // --- One XRP/USD rate for the whole run ----------------------------------
    // Fetched ONCE per run and only when a sower in this batch is on the XRP
    // rail. If no trustworthy price can be established we skip every XRP payout
    // this run (balances stay pending, retried next run) rather than guess.
    const needsXrp = sowerIds.some((sid) => profileByUser.get(sid)?.payout_network === "xrp");
    let xrpRate: XrpRateQuote | null = null;
    let xrpRateError: string | null = null;
    if (needsXrp && !dryRun) {
      try {
        xrpRate = await getXrpUsdRate();
        assertRateFresh(xrpRate.observedAt);
        console.log(
          `payout-sower-earnings: XRP/USD run rate ${xrpRate.rate} observed ${xrpRate.observedAt} from ${
            xrpRate.sources.map((s) => `${s.name}=${s.price}`).join(", ")
          }`,
        );
      } catch (e) {
        xrpRate = null;
        xrpRateError = e instanceof Error ? e.message : String(e);
        console.error(
          `payout-sower-earnings: SKIPPING ALL XRP PAYOUTS this run — no trustworthy XRP/USD price. Reason: ${xrpRateError}. Balances remain pending and will be retried on the next run.`,
        );
      }
    }


    const provider = payoutProvider();
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

      // --- Default rail: NOWPayments Mass Payouts ---------------------------
      // The platform's holding wallets live at NOWPayments and S2G holds no hot
      // keys, so crypto leaves through NOWPayments unless PAYOUT_PROVIDER=hotkey.
      // Creating a batch does NOT move funds: it returns a batch id awaiting a
      // human 2FA verification, so rows are marked 'awaiting_2fa', never 'paid'.
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
          continue; // stays pending — retried next run
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
          externalId: `sower_earnings:${sid}:${Date.now()}`,
          role: "sower",
          address: profile.payout_address,
          target,
        });

        if (np.status !== "awaiting_2fa" || !np.reference) {
          console.error("nowpayments sower payout not created", sid, np.error, np.raw);
          outcomes.push({
            ...base,
            status: "failed",
            network,
            provider,
            reason: np.error ?? "nowpayments_payout_not_created",
          });
          continue; // stays pending — retried on the next run
        }

        const npRate = network === "xrp" ? (xrpRate?.rate ?? null) : null;
        const { error: npMarkErr } = await admin
          .from("product_bestowals")
          .update({
            payout_status: "awaiting_2fa",
            payout_reference: np.reference,
            payout_provider: "nowpayments",
            payout_fx_rate: npRate,
            payout_fx_observed_at: network === "xrp" ? (xrpRate?.observedAt ?? null) : null,
            payout_fx_sources: network === "xrp" ? (xrpRate?.sources ?? null) : null,
          })
          .in("id", bucket.ids);
        if (npMarkErr) {
          console.error(
            "CRITICAL: NOWPayments batch created but ledger not marked awaiting_2fa",
            sid,
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
              .from("product_bestowals")
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
          recipient_user_id: sid,
          amount: amountUsd, // USDC is 1:1 with the USD ledger amount
          reference: `sower_earnings:${sid}`,
        };
      } else if (network === "xrp") {
        // XRP is a rail, not a unit of account — the USD value converts at the
        // run-level rate observed above, so every XRP payout in this run uses
        // one price we actually saw and then record against the bestowal.
        if (!dryRun && !xrpRate) {
          outcomes.push({
            ...base,
            reason: `xrp_rate_unavailable:${xrpRateError ?? "no_rate"}`,
            network,
          });
          continue; // stays pending — retried next run
        }
        fn = "send-xrp-payout";
        payload = {
          recipient_user_id: sid,
          amount_usd: amountUsd,
          reference: `sower_earnings:${sid}`,
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
        .from("product_bestowals")
        .update({
          payout_status: "paid",
          paid_at: new Date().toISOString(),
          payout_reference: tx,
          payout_provider: "hotkey",
          payout_fx_rate: usedRate,
          payout_fx_observed_at: usedObservedAt,
          payout_fx_sources: usedSources,
        })
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

      // Per-bestowal XRP amount, so "$X became Y XRP" is answerable row by row.
      if (usedRate) {
        for (const id of bucket.ids) {
          const usd = amountById.get(id) ?? 0;
          if (usd <= 0) continue;
          const { error: xrpErr } = await admin
            .from("product_bestowals")
            .update({ payout_amount_xrp: usdToXrp(usd, usedRate) })
            .eq("id", id);
          if (xrpErr) console.error("could not record payout_amount_xrp", id, xrpErr.message);
        }
      }

      outcomes.push({
        ...base,
        status: "paid",
        network,
        tx,
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
    console.error("payout-sower-earnings error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
