// P0-5 Phase C2: returns bestowers' money after a gosat cancels an orchard.
// One refund row per holding (orchard_refunds), claimed here with
// FOR UPDATE SKIP LOCKED through orchard_refund_claim(), re-checked by the
// money-direction guardrail (_shared/orchardRefundRules.ts) on the fresh row,
// then sent on the original rail:
//   solana  sendUsdcPayout(hot wallet -> payer wallet), finalized commitment
//   paypal  POST /v2/payments/captures/{capture}/refund; COMPLETED confirms
//           here, PENDING is confirmed by paypal-webhook (PAYMENT.CAPTURE.REFUNDED)
// Every outcome is written back through the SECURITY DEFINER RPCs
// (confirm / sent / fail / defer / needs_human); the worker never writes the
// tables directly. Fees S2G absorbed land in the revenue ledger as
// refund_cost, from orchard_refund_confirm().
//
// Idempotency: a row with a rail_reference is never sent; a row stuck at
// 'sending' (crash between send and confirm) is re-examined after 15 min by
// searching the hot wallet's recent USDC transfers for exactly that amount
// to that destination since the claim, and recorded if found.
//
// Cap: the payout circuit breaker's ceiling (SOLANA_MAX_PER_TX_USD default
// 50; SOLANA_MAX_DAILY_USD default 200). Above the per-transaction cap the
// row is parked for a Squad decision; over the daily cap it waits.
//
// Auth: CRON_SECRET bearer (invoke_money_job every 10 min), the service-role
// apikey, or an admin/gosat session. Body: { orchardId?: string, limit?: number }.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as sol from "https://esm.sh/micro-sol-signer@0.8.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";
import { getSolanaCluster, getSolanaRpcUrl, USDC_MINTS } from "../_shared/cryptoNetworks.ts";
import { getHotWalletSolBalance, getHotWalletUsdcBalance, loadHotWalletKeypair, sendUsdcPayout, verifyHotWallet } from "../_shared/solanaPayout.ts";
import { paypalBaseUrl, paypalFetch } from "../_shared/paypal/client.ts";
import {
  findRefundSendInParsedTxs,
  ORCHARD_REFUND_STALE_SENDING_MS,
  paypalRefundFeeCost,
  refundSendAllowed,
  SOLANA_REFUND_FEE_USD,
  type RecentParsedTx,
  type RefundClaim,
  type RefundGuardContext,
} from "../_shared/orchardRefundRules.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
// Same ceiling as payout-earnings' circuit breaker (owner decision).
const MAX_PER_TX_USD = Number(Deno.env.get("SOLANA_MAX_PER_TX_USD")) || 50;
const MAX_DAILY_USD = Number(Deno.env.get("SOLANA_MAX_DAILY_USD")) || 200;
const MIN_SOL_FOR_FEES = 0.001;

// deno-lint-ignore no-explicit-any
type Admin = SupabaseClient<any, any, any>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) return json({ error: "server_misconfigured" }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const apikeyHeader = req.headers.get("apikey") ?? "";

  let authorized = false;
  let actor = "cron";
  if (CRON_SECRET && token && token === CRON_SECRET) authorized = true;
  if (!authorized && apikeyHeader && apikeyHeader === SERVICE_ROLE_KEY) { authorized = true; actor = "service"; }
  if (!authorized && token) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u } = await userClient.auth.getUser();
    if (u?.user) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
      authorized = !!roles?.some((r: { role: string }) => ["admin", "gosat"].includes(r.role));
      if (authorized) actor = u.user.id;
    }
  }
  if (!authorized) return json({ error: "unauthorized" }, 401);

  let body: { orchardId?: string; limit?: number } = {};
  try { body = await req.json(); } catch { body = {}; }

  const cluster = getSolanaCluster();
  const ctxBase: Omit<RefundGuardContext, "sentTodayUsd"> = {
    solanaEnvironment: cluster === "mainnet-beta" ? "live" : "devnet",
    paypalEnvironment: paypalBaseUrl().includes("sandbox") ? "sandbox" : "live",
    maxPerTxUsd: MAX_PER_TX_USD,
    maxDailyUsd: MAX_DAILY_USD,
  };

  const report: Array<Record<string, unknown>> = [];
  try {
    // 1. Rows stuck at 'sending': did the money already leave?
    const staleBefore = new Date(Date.now() - ORCHARD_REFUND_STALE_SENDING_MS).toISOString();
    let staleQ = admin.from("orchard_refunds").select("id, rail, amount, destination, environment, claimed_at, attempts, rail_reference")
      .eq("status", "sending").lt("claimed_at", staleBefore);
    if (body.orchardId) staleQ = staleQ.eq("orchard_id", body.orchardId);
    const { data: stale } = await staleQ;
    for (const s of stale ?? []) {
      report.push(await reexamineStale(admin, s, ctxBase.solanaEnvironment));
    }

    // 2. Claim and send.
    const { data: claims, error: claimErr } = await admin.rpc("orchard_refund_claim", {
      _limit: Math.min(Math.max(Number(body.limit) || 10, 1), 50),
      _orchard_id: body.orchardId ?? null,
    });
    if (claimErr) return json({ ok: false, error: "claim_failed", detail: claimErr.message, report }, 500);

    let hotWallet: { seed: Uint8Array; address: string } | null = null;
    for (const raw of (claims ?? []) as RefundClaim[]) {
      const c: RefundClaim = { ...raw, amount: Number(raw.amount), holding_gross: Number(raw.holding_gross), attempts: Number(raw.attempts ?? 0) };
      const { data: sentToday } = await admin.rpc("orchard_refunds_sent_today", { _environment: c.environment });
      const ctx: RefundGuardContext = { ...ctxBase, sentTodayUsd: Number(sentToday ?? 0) };
      const decision = refundSendAllowed(c, ctx);
      if (!decision.ok) {
        const fn = decision.action === "defer" ? "orchard_refund_defer" : "orchard_refund_needs_human";
        await admin.rpc(fn, { _refund_id: c.id, _reason: decision.reason });
        report.push({ refund: c.id, rail: c.rail, amount: c.amount, result: decision.action, reason: decision.reason });
        continue;
      }

      if (c.rail === "solana") {
        if (!hotWallet) {
          try {
            const seed = loadHotWalletKeypair();
            hotWallet = { seed, address: verifyHotWallet(seed).address };
          } catch (err) {
            const reason = "hot wallet not configured: " + (err instanceof Error ? err.message : String(err));
            await admin.rpc("orchard_refund_defer", { _refund_id: c.id, _reason: reason });
            report.push({ refund: c.id, result: "defer", reason });
            continue;
          }
        }
        report.push(await sendSolanaRefund(admin, c, hotWallet, cluster));
      } else {
        report.push(await sendPaypalRefund(admin, c));
      }
    }
    return json({ ok: true, actor, cluster, paypal: ctxBase.paypalEnvironment, stale: (stale ?? []).length, claimed: (claims ?? []).length, report });
  } catch (err) {
    console.error("orchard-refund-worker error", err);
    await logFunctionFailure("orchard-refund-worker", err);
    return json({ ok: false, error: err instanceof Error ? err.message : String(err), report }, 500);
  }
});

// ---------------------------------------------------------------------------

async function sendSolanaRefund(admin: Admin, c: RefundClaim, hot: { seed: Uint8Array; address: string }, cluster: "mainnet-beta" | "devnet") {
  const destination = c.destination as string;
  // Pre-flight: enough USDC and a little SOL. A shortfall is a wait, not a failure.
  try {
    const [usdc, solBal] = await Promise.all([getHotWalletUsdcBalance(hot.seed, cluster), getHotWalletSolBalance(hot.seed)]);
    if (usdc < c.amount) {
      const reason = `hot wallet holds ${usdc} USDC on ${cluster}, refund needs ${c.amount}`;
      await admin.rpc("orchard_refund_defer", { _refund_id: c.id, _reason: reason });
      return { refund: c.id, result: "defer", reason };
    }
    if (solBal < MIN_SOL_FOR_FEES) {
      const reason = `hot wallet holds ${solBal} SOL, below ${MIN_SOL_FOR_FEES} needed for the network fee`;
      await admin.rpc("orchard_refund_defer", { _refund_id: c.id, _reason: reason });
      return { refund: c.id, result: "defer", reason };
    }
  } catch (err) {
    const reason = "balance check failed: " + (err instanceof Error ? err.message : String(err));
    await admin.rpc("orchard_refund_defer", { _refund_id: c.id, _reason: reason });
    return { refund: c.id, result: "defer", reason };
  }

  // A retry after a failed attempt: did the previous attempt actually land?
  if (c.attempts > 0) {
    const found = await findPriorSend(hot.address, destination, c.amount, cluster, c.claimed_at);
    if (found) {
      const r = await admin.rpc("orchard_refund_confirm", { _refund_id: c.id, _rail_reference: found, _fee_cost: SOLANA_REFUND_FEE_USD, _detail: "found on chain before retry" });
      return { refund: c.id, result: "confirmed_found_on_chain", signature: found, confirm: r.data ?? r.error?.message };
    }
  }

  try {
    const { signature } = await sendUsdcPayout(hot.seed, destination, c.amount);
    const r = await admin.rpc("orchard_refund_confirm", { _refund_id: c.id, _rail_reference: signature, _fee_cost: SOLANA_REFUND_FEE_USD, _detail: `sent on ${cluster}` });
    if (r.error) console.error("orchard-refund-worker: confirm failed after a successful send", c.id, signature, r.error.message);
    return { refund: c.id, rail: "solana", amount: c.amount, destination, result: "confirmed", signature, cluster, confirm: r.data ?? r.error?.message };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Broadcast may have happened (finalization timeout): look before failing.
    if (/timed out waiting for signature/i.test(msg)) {
      const found = await findPriorSend(hot.address, destination, c.amount, cluster, c.claimed_at);
      if (found) {
        const r = await admin.rpc("orchard_refund_confirm", { _refund_id: c.id, _rail_reference: found, _fee_cost: SOLANA_REFUND_FEE_USD, _detail: "finalization timed out; found on chain" });
        return { refund: c.id, result: "confirmed_after_timeout", signature: found, confirm: r.data ?? r.error?.message };
      }
    }
    const r = await admin.rpc("orchard_refund_fail", { _refund_id: c.id, _error: msg });
    return { refund: c.id, rail: "solana", amount: c.amount, result: "failed_attempt", error: msg, next: r.data ?? r.error?.message };
  }
}

interface PaypalRefundResponse {
  id?: string;
  status?: string;
  seller_payable_breakdown?: { paypal_fee?: { value?: string }; gross_amount?: { value?: string } };
  name?: string;
  message?: string;
  details?: Array<{ issue?: string; description?: string }>;
}

async function sendPaypalRefund(admin: Admin, c: RefundClaim) {
  const capture = c.destination as string;
  let captureFee = 0;
  try {
    const cap = await paypalFetch<{ seller_receivable_breakdown?: { paypal_fee?: { value?: string } } }>(`/v2/payments/captures/${capture}`);
    captureFee = Number(cap.data?.seller_receivable_breakdown?.paypal_fee?.value ?? 0) || 0;
  } catch (err) {
    console.warn("orchard-refund-worker: capture fee lookup failed", capture, err);
  }
  try {
    const res = await paypalFetch<PaypalRefundResponse>(`/v2/payments/captures/${capture}/refund`, {
      method: "POST",
      headers: { "PayPal-Request-Id": `orchard-refund-${c.id}` },   // PayPal de-duplicates on this id
      body: { amount: { value: c.amount.toFixed(2), currency_code: "USD" }, note_to_payer: "Sow2Grow orchard cancelled: full refund" },
    });
    const d = res.data ?? {};
    const refundId = d.id;
    if (!res.ok || !refundId) {
      const detail = d.details?.map((x) => `${x.issue ?? ""} ${x.description ?? ""}`.trim()).join("; ") || d.message || res.raw.slice(0, 300);
      const r = await admin.rpc("orchard_refund_fail", { _refund_id: c.id, _error: `paypal ${res.status}: ${detail}` });
      return { refund: c.id, rail: "paypal", amount: c.amount, result: "failed_attempt", error: detail, next: r.data ?? r.error?.message };
    }
    const fee = paypalRefundFeeCost(captureFee, Number(d.seller_payable_breakdown?.paypal_fee?.value ?? 0));
    if (d.status === "COMPLETED") {
      const r = await admin.rpc("orchard_refund_confirm", { _refund_id: c.id, _rail_reference: refundId, _fee_cost: fee, _detail: "paypal COMPLETED" });
      return { refund: c.id, rail: "paypal", amount: c.amount, result: "confirmed", refund_id: refundId, fee, confirm: r.data ?? r.error?.message };
    }
    if (d.status === "PENDING") {
      const r = await admin.rpc("orchard_refund_sent", { _refund_id: c.id, _rail_reference: refundId, _fee_cost: fee, _detail: "paypal PENDING; webhook confirms" });
      return { refund: c.id, rail: "paypal", amount: c.amount, result: "sent_pending", refund_id: refundId, fee, next: r.data ?? r.error?.message };
    }
    // CANCELLED / FAILED with an id: keep the id so nobody retries blindly.
    await admin.rpc("orchard_refund_sent", { _refund_id: c.id, _rail_reference: refundId, _fee_cost: fee, _detail: `paypal ${d.status}` });
    const r = await admin.rpc("orchard_refund_needs_human", { _refund_id: c.id, _reason: `paypal refund ${refundId} is ${d.status}` });
    return { refund: c.id, rail: "paypal", result: "needs_human", refund_id: refundId, status: d.status, next: r.data ?? r.error?.message };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const r = await admin.rpc("orchard_refund_fail", { _refund_id: c.id, _error: msg });
    return { refund: c.id, rail: "paypal", amount: c.amount, result: "failed_attempt", error: msg, next: r.data ?? r.error?.message };
  }
}

/** A row that sat at 'sending' too long: find the send on chain, else count a failed attempt. */
async function reexamineStale(admin: Admin, s: { id: string; rail: string; amount: number; destination: string | null; environment: string; claimed_at: string | null; attempts: number; rail_reference: string | null }, solanaEnv: string) {
  if (s.rail_reference) {
    // PayPal PENDING rows are 'sent', not 'sending'; a 'sending' row with a reference is an anomaly for a human.
    const r = await admin.rpc("orchard_refund_needs_human", { _refund_id: s.id, _reason: `stuck at sending with reference ${s.rail_reference}` });
    return { refund: s.id, result: "stale_needs_human", next: r.data ?? r.error?.message };
  }
  if (s.rail === "solana" && s.destination && s.environment === solanaEnv) {
    try {
      const seed = loadHotWalletKeypair();
      const { address } = verifyHotWallet(seed);
      const found = await findPriorSend(address, s.destination, Number(s.amount), getSolanaCluster(), s.claimed_at);
      if (found) {
        const r = await admin.rpc("orchard_refund_confirm", { _refund_id: s.id, _rail_reference: found, _fee_cost: SOLANA_REFUND_FEE_USD, _detail: "stale sending row; found on chain" });
        return { refund: s.id, result: "stale_confirmed_found_on_chain", signature: found, confirm: r.data ?? r.error?.message };
      }
    } catch (err) {
      console.warn("orchard-refund-worker: stale search failed", s.id, err);
    }
  }
  const r = await admin.rpc("orchard_refund_fail", { _refund_id: s.id, _error: `stuck at sending since ${s.claimed_at}; no matching send found` });
  return { refund: s.id, result: "stale_failed_attempt", next: r.data ?? r.error?.message };
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(getSolanaRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`solana_rpc_error: ${body.error.message ?? JSON.stringify(body.error)}`);
  return body.result as T;
}

/** Recent USDC transfers out of the hot wallet: is there one of exactly this amount to this owner since the claim? */
async function findPriorSend(hotWalletAddress: string, destinationOwner: string, amountUsd: number, cluster: "mainnet-beta" | "devnet", claimedAt: string | null): Promise<string | null> {
  const mint = USDC_MINTS[cluster];
  const hotWalletAta = sol.tokenAddress({ mint, owner: hotWalletAddress, tokenProgram: sol.TOKEN_PROGRAM });
  const sinceUnix = Math.floor((claimedAt ? new Date(claimedAt).getTime() : Date.now() - 6 * 3600 * 1000) / 1000) - 60;
  const sigs = await rpcCall<Array<{ signature: string; blockTime?: number | null; err?: unknown }>>("getSignaturesForAddress", [hotWalletAta, { limit: 25 }]);
  const txs: RecentParsedTx[] = [];
  for (const s of sigs ?? []) {
    if (s.err) continue;
    if (typeof s.blockTime === "number" && s.blockTime < sinceUnix) continue;
    const tx = await rpcCall<RecentParsedTx | null>("getTransaction", [s.signature, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 }]);
    if (tx) txs.push({ ...tx, signature: s.signature, blockTime: s.blockTime ?? tx.blockTime ?? null });
  }
  return findRefundSendInParsedTxs(txs, { mint, hotWalletAta, destinationOwner, amountUsd, sinceUnix });
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
