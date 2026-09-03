// On-demand S2G Balance withdrawal.
//
// Member requests any amount up to their available balance
// (balance_available_v). The ledger is debited FIRST (before any send is
// attempted) -- that debit, via debit_balance_ledger's advisory-lock/
// idempotency-key shape, is the entire "claim," unlike the owed_payout_
// balances()-sourced rows payout-earnings claims via covered_rows (there is
// no source row here to compare-and-swap; the ledger itself already is one).
//
// Two rails, same resolution payout-earnings already uses
// (profiles.payout_network / payout_address / payout_details_updated_at):
//   - Solana USDC: sent INSTANTLY, synchronously, in this same request, via
//     the same hot-wallet primitive and the same circuit breakers
//     (SOLANA_MAX_PER_TX_USD / SOLANA_MAX_DAILY_USD / cooling-off) the
//     weekly cron already enforces -- no changes to _shared/solanaPayout.ts,
//     just a second caller. A failed send refunds the ledger.
//   - PayPal: NOT sent synchronously ("batched" per spec-payments.md) --
//     this just inserts a payouts row (status='processing', rail='paypal',
//     recipient_type='member') and returns immediately. The existing weekly
//     payout-earnings run picks it up in its PayPal batch (see the
//     extension there); paypal-webhook's PAYMENT.PAYOUTS-ITEM.* handler
//     refunds the ledger if that batch item ultimately fails. A $20 minimum
//     (PayPal's real per-item cost) applies to a PayPal-rail withdrawal
//     REQUEST itself -- no aggregation of multiple small requests into one
//     future batch item in this pass.

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

const MIN_PAYPAL_WITHDRAWAL_USD = 20;
const SOLANA_MAX_PER_TX_USD = Number(Deno.env.get("SOLANA_MAX_PER_TX_USD")) || 50;
const SOLANA_MAX_DAILY_USD = Number(Deno.env.get("SOLANA_MAX_DAILY_USD")) || 200;
const PAYOUT_ADDRESS_COOLING_OFF_HOURS = Number(Deno.env.get("PAYOUT_ADDRESS_COOLING_OFF_HOURS")) || 48;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const rlOk = await checkRateLimit(
      service, userId, RateLimitPresets.PAYMENT.limitType,
      RateLimitPresets.PAYMENT.maxAttempts, RateLimitPresets.PAYMENT.timeWindowMinutes, true,
    );
    if (!rlOk) return createRateLimitResponse(RateLimitPresets.PAYMENT.timeWindowMinutes * 60);

    let payload: { amount?: number };
    try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const amount = round2(Number(payload?.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "invalid_amount" }, 400);
    }

    // --- Resolve rail from the member's own stored payout config, exactly
    // like payout-earnings does -- never a second place to configure it.
    const { data: profile } = await service
      .from("profiles")
      .select("payout_network, payout_address, payout_details_updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const isSolana = profile?.payout_network === "solana_usdc" && !!profile?.payout_address;

    let rail: "solana_usdc" | "paypal";
    let solanaAddress: string | null = null;
    let paypalEmail: string | null = null;

    if (isSolana) {
      const addrErr = validateSolanaAddress(profile!.payout_address as string);
      if (addrErr) return json({ error: "invalid_solana_address", detail: addrErr }, 409);
      if (profile!.payout_details_updated_at) {
        const hours = (Date.now() - new Date(profile!.payout_details_updated_at as string).getTime()) / (1000 * 60 * 60);
        if (hours < PAYOUT_ADDRESS_COOLING_OFF_HOURS) {
          return json({ error: "payout_address_cooling_off", hoursRemaining: round2(PAYOUT_ADDRESS_COOLING_OFF_HOURS - hours) }, 409);
        }
      }
      if (amount > SOLANA_MAX_PER_TX_USD) {
        return json({ error: "exceeds_per_tx_cap", cap: SOLANA_MAX_PER_TX_USD }, 409);
      }
      rail = "solana_usdc";
      solanaAddress = profile!.payout_address as string;
    } else {
      if (amount < MIN_PAYPAL_WITHDRAWAL_USD) {
        return json({ error: "below_paypal_minimum", minimum: MIN_PAYPAL_WITHDRAWAL_USD }, 409);
      }
      const { data: wallet } = await service
        .from("user_wallets")
        .select("wallet_address")
        .eq("user_id", userId)
        .eq("wallet_type", "paypal_email")
        .eq("is_active", true)
        .not("verified_at", "is", null)
        .order("is_primary", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!wallet?.wallet_address) {
        return json({ error: "no_verified_paypal_email" }, 409);
      }
      rail = "paypal";
      paypalEmail = wallet.wallet_address;
    }

    // --- Insert the payouts row, then debit the ledger against its own id
    // as the idempotency key -- a double-submit of the same request can
    // never debit twice.
    const { data: prow, error: insErr } = await service
      .from("payouts")
      .insert({
        run_id: crypto.randomUUID(),
        recipient_type: "member",
        recipient_user_id: userId,
        amount,
        currency: "USD",
        rail,
        status: "processing",
        covered_rows: [],
      })
      .select("id")
      .single();
    if (insErr || !prow) {
      console.error("request-balance-withdrawal: payouts insert failed", insErr);
      return json({ error: "withdrawal_insert_failed", detail: insErr?.message }, 500);
    }

    const { error: debitError } = await service.rpc("debit_balance_ledger", {
      _user_id: userId,
      _amount: amount,
      _kind: "withdrawal",
      _reference_table: "payouts",
      _reference_id: prow.id,
      _idempotency_key: prow.id,
      _created_by: userId,
      _notes: `withdrawal via ${rail}`,
    });
    if (debitError) {
      await service.from("payouts").update({ status: "failed", error: "debit_failed" }).eq("id", prow.id);
      if (debitError.message?.startsWith("insufficient_balance")) {
        const available = Number(debitError.message.split(":")[1] ?? 0);
        return json({ error: "insufficient_balance", available, shortBy: round2(amount - available) }, 402);
      }
      console.error("request-balance-withdrawal: debit failed", debitError);
      return json({ error: "debit_failed", detail: debitError.message }, 500);
    }

    // --- PayPal: leave it 'processing' for the weekly batch. ----------------
    if (rail === "paypal") {
      return json({ withdrawalId: prow.id, rail, status: "processing", amount, message: "Queued for the next PayPal payout batch." });
    }

    // --- Solana: send NOW, synchronously, same daily-cap accounting as the
    // weekly cron (today's already-paid solana_usdc payouts, across every
    // rail/recipient_type, plus this one). ------------------------------------
    let sender: Uint8Array;
    let hotWalletAddress: string;
    const cluster = getSolanaCluster();
    try {
      sender = loadHotWalletKeypair();
      ({ address: hotWalletAddress } = verifyHotWallet(sender));
    } catch (setupErr) {
      const reason = setupErr instanceof Error ? setupErr.message : String(setupErr);
      console.error("request-balance-withdrawal: solana not configured —", reason);
      await refundAndFail(service, prow.id, userId, amount, "solana_not_configured");
      return json({ error: "solana_not_configured" }, 500);
    }

    const todayStartIso = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
    const { data: sentTodayRows } = await service
      .from("payouts")
      .select("amount")
      .eq("rail", "solana_usdc")
      .eq("status", "paid")
      .gte("created_at", todayStartIso);
    const dailySpent = round2((sentTodayRows ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));
    if (dailySpent + amount > SOLANA_MAX_DAILY_USD) {
      await refundAndFail(service, prow.id, userId, amount, "exceeds_daily_cap_needs_squad_approval");
      return json({ error: "exceeds_daily_cap_needs_squad_approval", cap: SOLANA_MAX_DAILY_USD }, 409);
    }

    const balance = await getHotWalletUsdcBalance(sender, cluster);
    if (balance < amount) {
      console.error(`request-balance-withdrawal: hot wallet balance ${balance} < requested ${amount}`);
      await refundAndFail(service, prow.id, userId, amount, "insufficient_hot_wallet_balance");
      return json({ error: "insufficient_hot_wallet_balance" }, 503);
    }

    try {
      const { signature } = await sendUsdcPayout(sender, solanaAddress!, amount);
      const { error: updErr } = await service
        .from("payouts")
        .update({ status: "paid", solana_tx_signature: signature, solana_cluster: cluster, completed_at: new Date().toISOString() })
        .eq("id", prow.id);
      if (updErr) {
        // The transfer is irreversible and finalized on-chain at this point.
        // Same "needs a human" shape as payout-earnings: never auto-retry a
        // send that may have already succeeded.
        console.error(
          `request-balance-withdrawal: NEEDS A HUMAN — Solana send SUCCEEDED (signature=${signature}, ` +
            `payouts.id=${prow.id}, user=${userId}, amount=${amount}) but the DB update failed: ${updErr.message}.`,
        );
        return json({ withdrawalId: prow.id, rail, status: "paid", amount, signature, warning: "state_update_failed_contact_support" });
      }
      return json({ withdrawalId: prow.id, rail, status: "paid", amount, signature, cluster });
    } catch (sendErr) {
      const reason = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error("request-balance-withdrawal: solana send failed", userId, reason);
      await refundAndFail(service, prow.id, userId, amount, reason);
      return json({ error: "solana_send_failed", detail: reason }, 502);
    }
  } catch (err) {
    console.error("request-balance-withdrawal error", err);
    await logFunctionFailure("request-balance-withdrawal", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function refundAndFail(service: any, payoutId: string, userId: string, amount: number, reason: string): Promise<void> {
  await service.from("payouts").update({ status: "failed", error: reason }).eq("id", payoutId);
  const { error } = await service.rpc("credit_balance_ledger", {
    _user_id: userId,
    _amount: amount,
    _kind: "refund",
    _reference_table: "payouts",
    _reference_id: payoutId,
    _idempotency_key: payoutId,
    _created_by: null,
    _notes: `withdrawal refund: ${reason}`,
  });
  if (error) {
    console.error(`request-balance-withdrawal: NEEDS A HUMAN — refund FAILED for payouts.id=${payoutId} user=${userId} amount=${amount}: ${error.message}`);
  }
}
