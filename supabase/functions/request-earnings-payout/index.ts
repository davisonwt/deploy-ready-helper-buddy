// "Request payout now" -- non-custodial model (legal, 2026-09-03).
// payout-earnings pays everyone automatically once their owed total
// reaches PAYOUT_THRESHOLD_USD (default $20). This lets a sower/whisperer
// on the Solana rail pull whatever they're currently owed early, for any
// amount >= $1 -- USDC transfer fees are a fraction of a cent, so there's
// no economic reason to make them wait. PayPal recipients can't get an
// instant out-of-cycle send here (PayPal's own per-item fee is exactly
// why the $20 threshold exists) -- this just tells them honestly where
// they stand instead of pretending to send something.
//
// Source of truth is the SAME owed_payout_balances() payout-earnings
// itself reads, filtered to the caller's own user id -- never a second
// place earnings are computed. Uses the identical claim/send/finalize
// shape as payout-earnings' Solana leg (markCoveredRowsProcessing's
// compare-and-swap is what makes this safe to run concurrently with the
// weekly cron without double-paying).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";
import { validateSolanaAddress } from "../_shared/cryptoAddress.ts";
import { getSolanaCluster } from "../_shared/cryptoNetworks.ts";
import {
  getHotWalletUsdcBalance,
  loadHotWalletKeypair,
  sendUsdcPayout,
  verifyHotWallet,
} from "../_shared/solanaPayout.ts";
import {
  markCoveredRowsPaid,
  markCoveredRowsPending,
  markCoveredRowsProcessing,
  type CoveredRow,
} from "../_shared/payoutLedger.ts";

const MIN_REQUEST_USD = 1;
const MIN_PAYPAL_PAYOUT_USD = 20;
const SOLANA_MAX_PER_TX_USD = Number(Deno.env.get("SOLANA_MAX_PER_TX_USD")) || 50;
const SOLANA_MAX_DAILY_USD = Number(Deno.env.get("SOLANA_MAX_DAILY_USD")) || 200;
const PAYOUT_ADDRESS_COOLING_OFF_HOURS = Number(Deno.env.get("PAYOUT_ADDRESS_COOLING_OFF_HOURS")) || 48;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface OwedRow {
  recipient_type: "sower" | "whisperer";
  recipient_user_id: string;
  amount_usd: number;
  covered_rows: CoveredRow[];
}

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
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const rlOk = await checkRateLimit(
      admin, userId, RateLimitPresets.PAYMENT.limitType,
      RateLimitPresets.PAYMENT.maxAttempts, RateLimitPresets.PAYMENT.timeWindowMinutes, true,
    );
    if (!rlOk) return createRateLimitResponse(RateLimitPresets.PAYMENT.timeWindowMinutes * 60);

    const { data: owedRaw, error: owedErr } = await admin.rpc("owed_payout_balances");
    if (owedErr) return json({ error: "owed_lookup_failed", detail: owedErr.message }, 500);
    const myOwed = ((owedRaw ?? []) as OwedRow[]).filter((r) => r.recipient_user_id === userId);
    const totalOwed = round2(myOwed.reduce((s, r) => s + Number(r.amount_usd || 0), 0));

    const { data: profile } = await admin
      .from("profiles")
      .select("payout_network, payout_address, payout_details_updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const isSolana = profile?.payout_network === "solana_usdc" && !!profile?.payout_address;

    // owed_payout_balances() is service-role only (RLS can't scope a
    // set-returning function per-caller) -- this is also the only way the
    // client can see its own owed total, so a preview call (no send) reuses
    // every check below except the actual dispatch, and skips the "nothing
    // owed" 409 so the UI can render "$0.00, nothing owed yet" instead of
    // treating it as an error.
    const body = await req.json().catch(() => ({}));
    if (body?.preview === true) {
      return json({
        totalOwed, rail: isSolana ? "solana_usdc" : "paypal",
        minimum: isSolana ? MIN_REQUEST_USD : MIN_PAYPAL_PAYOUT_USD,
        eligible: isSolana ? totalOwed >= MIN_REQUEST_USD : totalOwed >= MIN_PAYPAL_PAYOUT_USD,
      });
    }

    if (totalOwed <= 0) return json({ error: "nothing_owed" }, 409);

    if (!isSolana) {
      // PayPal's own per-item fee is exactly why the $20 threshold exists --
      // there is no instant out-of-cycle send to offer here, just the truth.
      if (totalOwed >= MIN_PAYPAL_PAYOUT_USD) {
        return json({
          rail: "paypal", queued: true, amount: totalOwed,
          message: `You're owed $${totalOwed.toFixed(2)} — you'll be paid automatically in the next scheduled PayPal run (Fridays).`,
        });
      }
      return json({
        error: `You're owed $${totalOwed.toFixed(2)} — PayPal payouts need $${MIN_PAYPAL_PAYOUT_USD} to cover PayPal's own per-transfer fee. It'll pay out automatically once you reach that. Switch to Solana USDC in payout settings for no-minimum instant payouts.`,
        reason: "below_paypal_minimum", amount: totalOwed, minimum: MIN_PAYPAL_PAYOUT_USD,
      }, 409);
    }

    const addrErr = validateSolanaAddress(profile!.payout_address as string);
    if (addrErr) return json({ error: "invalid_solana_address", detail: addrErr }, 409);
    if (profile!.payout_details_updated_at) {
      const hours = (Date.now() - new Date(profile!.payout_details_updated_at as string).getTime()) / (1000 * 60 * 60);
      if (hours < PAYOUT_ADDRESS_COOLING_OFF_HOURS) {
        return json({ error: "payout_address_cooling_off", hoursRemaining: round2(PAYOUT_ADDRESS_COOLING_OFF_HOURS - hours) }, 409);
      }
    }
    if (totalOwed < MIN_REQUEST_USD) {
      return json({ error: "below_minimum", amount: totalOwed, minimum: MIN_REQUEST_USD }, 409);
    }
    if (totalOwed > SOLANA_MAX_PER_TX_USD) {
      return json({ error: "exceeds_per_tx_cap", amount: totalOwed, cap: SOLANA_MAX_PER_TX_USD }, 409);
    }

    let sender: Uint8Array;
    let hotWalletAddress: string;
    const cluster = getSolanaCluster();
    try {
      sender = loadHotWalletKeypair();
      ({ address: hotWalletAddress } = verifyHotWallet(sender));
    } catch (setupErr) {
      const reason = setupErr instanceof Error ? setupErr.message : String(setupErr);
      console.error("request-earnings-payout: hot wallet not configured —", reason);
      return json({ error: "solana_not_configured" }, 500);
    }
    void hotWalletAddress;

    const todayStartIso = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
    const { data: sentTodayRows } = await admin
      .from("payouts")
      .select("amount")
      .eq("rail", "solana_usdc")
      .eq("status", "paid")
      .gte("created_at", todayStartIso);
    const dailySpent = round2((sentTodayRows ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));
    if (dailySpent + totalOwed > SOLANA_MAX_DAILY_USD) {
      return json({ error: "exceeds_daily_cap_needs_squad_approval", cap: SOLANA_MAX_DAILY_USD }, 409);
    }

    const hotBalance = await getHotWalletUsdcBalance(sender, cluster);
    if (hotBalance < totalOwed) {
      return json({ error: "insufficient_hot_wallet_balance" }, 503);
    }

    // One payouts row per (recipient_type) owed row, same shape payout-earnings uses.
    const paidRows: { recipient_type: string; amount: number; signature: string }[] = [];
    for (const r of myOwed) {
      const amount = round2(Number(r.amount_usd || 0));
      if (amount <= 0) continue;

      const { data: prow, error: insErr } = await admin
        .from("payouts")
        .insert({
          run_id: crypto.randomUUID(),
          recipient_type: r.recipient_type,
          recipient_user_id: userId,
          amount,
          currency: "USD",
          rail: "solana_usdc",
          solana_cluster: cluster,
          status: "processing",
          covered_rows: r.covered_rows,
        })
        .select("id")
        .single();
      if (insErr || !prow) {
        console.error("request-earnings-payout: payouts insert failed", userId, insErr?.message);
        continue;
      }

      const claim = await markCoveredRowsProcessing(admin, r.covered_rows as CoveredRow[]);
      if (!claim.allClaimed) {
        console.error(`request-earnings-payout: race detected for ${userId} (${r.recipient_type}) — reverting`);
        await markCoveredRowsPending(admin, r.covered_rows as CoveredRow[], "concurrent_run_claimed_first");
        await admin.from("payouts").update({ status: "failed", error: "concurrent_run_claimed_first" }).eq("id", prow.id);
        continue;
      }

      try {
        const { signature } = await sendUsdcPayout(sender, profile!.payout_address as string, amount);
        try {
          const { error: updErr } = await admin
            .from("payouts")
            .update({ status: "paid", solana_tx_signature: signature, completed_at: new Date().toISOString() })
            .eq("id", prow.id);
          if (updErr) throw updErr;
          await markCoveredRowsPaid(admin, r.covered_rows as CoveredRow[]);
          paidRows.push({ recipient_type: r.recipient_type, amount, signature });
        } catch (dbErr) {
          console.error(
            `request-earnings-payout: NEEDS A HUMAN — Solana send SUCCEEDED (signature=${signature}, ` +
              `payouts.id=${prow.id}, user=${userId}, amount=${amount}) but the DB update failed: ` +
              `${dbErr instanceof Error ? dbErr.message : String(dbErr)}.`,
          );
          paidRows.push({ recipient_type: r.recipient_type, amount, signature });
        }
      } catch (sendErr) {
        const reason = sendErr instanceof Error ? sendErr.message : String(sendErr);
        console.error("request-earnings-payout: solana send failed", userId, reason);
        await admin.from("payouts").update({ status: "failed", error: reason }).eq("id", prow.id);
        await markCoveredRowsPending(admin, r.covered_rows as CoveredRow[], reason);
      }
    }

    if (paidRows.length === 0) {
      return json({ error: "payout_failed" }, 500);
    }
    return json({
      rail: "solana_usdc", paid: true, cluster,
      total: round2(paidRows.reduce((s, r) => s + r.amount, 0)),
      rows: paidRows,
    });
  } catch (err) {
    console.error("request-earnings-payout error", err);
    await logFunctionFailure("request-earnings-payout", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
