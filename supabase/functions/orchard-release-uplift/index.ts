// P0-5 Phase D: releases a funded Uplift orchard to named parties and pays
// them in USDC from the hot wallet. A gosat drives it from /admin/orchards.
//
//   1. orchard_uplift_release(orchard, parties, retryIds, actor) validates the
//      parties, performs the ledger release on the first call (holdings ->
//      released, S2G's 15% into revenue_ledger, no sower payout) and hands
//      back one orchard_release_payments row per party at status 'sending'.
//   2. For each row the money-direction guardrail
//      (_shared/orchardUpliftRules.ts partySendAllowed) runs on the fresh row,
//      then sendUsdcPayout(hot wallet -> destination) at finalized commitment,
//      then orchard_uplift_payment_paid(row, signature).
//   3. A failure is recorded per row (orchard_uplift_payment_fail; the 3rd
//      parks it at needs_human and alerts gosats). Successful rows stay paid.
//      The response says exactly which rows failed.
//
// Idempotency: a row with a reference is never sent; a retried row is first
// searched for on chain (a transfer of exactly that amount to that
// destination since the row was created) and recorded if found; the
// database's sum guard never lets the parties exceed the sower total.
//
// USDC only in this phase (owner decision): the RPC refuses any other rail.
// Cap: the payout circuit breaker's ceiling (SOLANA_MAX_PER_TX_USD default 50;
// SOLANA_MAX_DAILY_USD default 200) -- above the per-transaction cap the row
// parks for a Squad decision; over the daily cap it waits.
//
// Auth: an admin/gosat session (Authorization: Bearer <access token>) or the
// service-role apikey. Body: { orchardId, parties?: [{label, amount,
// destination}], retryPaymentIds?: string[] }.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as sol from "https://esm.sh/micro-sol-signer@0.8.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";
import { getSolanaCluster, getSolanaRpcUrl, USDC_MINTS } from "../_shared/cryptoNetworks.ts";
import { getHotWalletSolBalance, getHotWalletUsdcBalance, loadHotWalletKeypair, sendUsdcPayout, verifyHotWallet } from "../_shared/solanaPayout.ts";
import { findRefundSendInParsedTxs, type RecentParsedTx } from "../_shared/orchardRefundRules.ts";
import {
  partySendAllowed,
  validateParties,
  type PartyGuardContext,
  type PartyInput,
  type PartyRow,
} from "../_shared/orchardUpliftRules.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
const MAX_PER_TX_USD = Number(Deno.env.get("SOLANA_MAX_PER_TX_USD")) || 50;
const MAX_DAILY_USD = Number(Deno.env.get("SOLANA_MAX_DAILY_USD")) || 200;
const MIN_SOL_FOR_FEES = 0.001;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  let actorId: string | null = null;
  let authorized = false;
  if (apikeyHeader && apikeyHeader === SERVICE_ROLE_KEY) authorized = true;
  if (!authorized && token) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u } = await userClient.auth.getUser();
    if (u?.user) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
      authorized = !!roles?.some((r: { role: string }) => ["admin", "gosat"].includes(r.role));
      if (authorized) actorId = u.user.id;
    }
  }
  if (!authorized) return json({ error: "unauthorized" }, 401);

  let body: { orchardId?: string; parties?: PartyInput[]; retryPaymentIds?: string[] } = {};
  try { body = await req.json(); } catch { body = {}; }
  if (!body.orchardId || !UUID.test(body.orchardId)) return json({ ok: false, error: "orchard_id_required" }, 400);
  const retryIds = (body.retryPaymentIds ?? []).filter((id) => UUID.test(id));
  const parties = Array.isArray(body.parties) ? body.parties : [];
  if (parties.length > 0) {
    const v = validateParties(parties, Number.POSITIVE_INFINITY);   // the RPC enforces the remaining amount under lock
    if (!v.ok) return json({ ok: false, error: "parties_invalid", problems: v.problems }, 400);
  }
  if (parties.length === 0 && retryIds.length === 0) return json({ ok: false, error: "no_parties" }, 400);

  const cluster = getSolanaCluster();
  const ctxBase: Omit<PartyGuardContext, "sentTodayUsd"> = {
    solanaEnvironment: cluster === "mainnet-beta" ? "live" : "devnet",
    maxPerTxUsd: MAX_PER_TX_USD,
    maxDailyUsd: MAX_DAILY_USD,
  };

  const report: Array<Record<string, unknown>> = [];
  try {
    // 1. Ledger release (first call) + the rows to pay, all under the orchard lock.
    const { data: rel, error: relErr } = await admin.rpc("orchard_uplift_release", {
      _orchard_id: body.orchardId,
      _parties: parties.map((p) => ({ label: String(p.label).trim(), amount: Number(p.amount), destination: String(p.destination).trim(), rail: "solana" })),
      _retry_ids: retryIds.length ? retryIds : null,
      _actor: actorId,
    });
    if (relErr) return json({ ok: false, error: "release_failed", detail: relErr.message }, 500);
    const release = rel as { ok: boolean; reason?: string; rows?: PartyRow[]; [k: string]: unknown };
    if (!release?.ok) return json({ ok: false, error: release?.reason ?? "release_refused", release }, 409);

    // 2. Pay each row.
    let hotWallet: { seed: Uint8Array; address: string } | null = null;
    let failed = 0;
    for (const raw of (release.rows ?? []) as PartyRow[]) {
      const r: PartyRow = { ...raw, amount: Number(raw.amount), attempts: Number(raw.attempts ?? 0) };
      const { data: sentToday } = await admin.rpc("orchard_uplift_payments_sent_today", { _environment: r.environment });
      const ctx: PartyGuardContext = { ...ctxBase, sentTodayUsd: Number(sentToday ?? 0) };
      const decision = partySendAllowed(r, ctx);
      if (!decision.ok) {
        const fn = decision.action === "defer" ? "orchard_uplift_payment_defer" : "orchard_uplift_payment_needs_human";
        await admin.rpc(fn, { _payment_id: r.id, _reason: decision.reason });
        report.push({ payment: r.id, label: r.label, amount: r.amount, result: decision.action, reason: decision.reason });
        failed += 1;
        continue;
      }
      if (!hotWallet) {
        try {
          const seed = loadHotWalletKeypair();
          hotWallet = { seed, address: verifyHotWallet(seed).address };
        } catch (err) {
          const reason = "hot wallet not configured: " + (err instanceof Error ? err.message : String(err));
          await admin.rpc("orchard_uplift_payment_defer", { _payment_id: r.id, _reason: reason });
          report.push({ payment: r.id, label: r.label, amount: r.amount, result: "defer", reason });
          failed += 1;
          continue;
        }
      }
      const out = await payParty(admin, r, hotWallet, cluster);
      if (out.result !== "paid" && out.result !== "paid_found_on_chain" && out.result !== "paid_after_timeout") failed += 1;
      report.push(out);
    }

    const { rows: _rows, ...summary } = release;
    return json({
      ok: failed === 0,
      actor: actorId ?? "service",
      cluster,
      orchard_id: body.orchardId,
      ...summary,
      attempted: (release.rows ?? []).length,
      failed,
      report,
    });
  } catch (err) {
    console.error("orchard-release-uplift error", err);
    await logFunctionFailure("orchard-release-uplift", err);
    return json({ ok: false, error: err instanceof Error ? err.message : String(err), report }, 500);
  }
});

// ---------------------------------------------------------------------------

async function payParty(admin: Admin, r: PartyRow, hot: { seed: Uint8Array; address: string }, cluster: "mainnet-beta" | "devnet") {
  const base = { payment: r.id, label: r.label, amount: r.amount, destination: r.destination, rail: "solana", cluster };
  // Pre-flight: enough USDC and a little SOL. A shortfall is a wait, not a failure.
  try {
    const [usdc, solBal] = await Promise.all([getHotWalletUsdcBalance(hot.seed, cluster), getHotWalletSolBalance(hot.seed)]);
    if (usdc < r.amount) {
      const reason = `hot wallet holds ${usdc} USDC on ${cluster}, party payment needs ${r.amount}`;
      await admin.rpc("orchard_uplift_payment_defer", { _payment_id: r.id, _reason: reason });
      return { ...base, result: "defer", reason };
    }
    if (solBal < MIN_SOL_FOR_FEES) {
      const reason = `hot wallet holds ${solBal} SOL, below ${MIN_SOL_FOR_FEES} needed for the network fee`;
      await admin.rpc("orchard_uplift_payment_defer", { _payment_id: r.id, _reason: reason });
      return { ...base, result: "defer", reason };
    }
  } catch (err) {
    const reason = "balance check failed: " + (err instanceof Error ? err.message : String(err));
    await admin.rpc("orchard_uplift_payment_defer", { _payment_id: r.id, _reason: reason });
    return { ...base, result: "defer", reason };
  }

  // A retry: did an earlier attempt actually land?
  if (r.attempts > 0) {
    const found = await findPriorSend(hot.address, r.destination, r.amount, cluster, r.created_at ?? null);
    if (found) {
      const p = await admin.rpc("orchard_uplift_payment_paid", { _payment_id: r.id, _reference: found, _detail: "found on chain before retry" });
      return { ...base, result: "paid_found_on_chain", signature: found, record: p.data ?? p.error?.message };
    }
  }

  try {
    const { signature } = await sendUsdcPayout(hot.seed, r.destination, r.amount);
    const p = await admin.rpc("orchard_uplift_payment_paid", { _payment_id: r.id, _reference: signature, _detail: `sent on ${cluster}` });
    if (p.error) console.error("orchard-release-uplift: record failed after a successful send", r.id, signature, p.error.message);
    return { ...base, result: "paid", signature, record: p.data ?? p.error?.message };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/timed out waiting for signature/i.test(msg)) {
      const found = await findPriorSend(hot.address, r.destination, r.amount, cluster, r.created_at ?? null);
      if (found) {
        const p = await admin.rpc("orchard_uplift_payment_paid", { _payment_id: r.id, _reference: found, _detail: "finalization timed out; found on chain" });
        return { ...base, result: "paid_after_timeout", signature: found, record: p.data ?? p.error?.message };
      }
    }
    const f = await admin.rpc("orchard_uplift_payment_fail", { _payment_id: r.id, _error: msg });
    return { ...base, result: "failed_attempt", error: msg, next: f.data ?? f.error?.message };
  }
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

/** Recent USDC transfers out of the hot wallet: one of exactly this amount to this owner since the row was created? (Same search as orchard-refund-worker.) */
async function findPriorSend(hotWalletAddress: string, destinationOwner: string, amountUsd: number, cluster: "mainnet-beta" | "devnet", sinceIso: string | null): Promise<string | null> {
  const mint = USDC_MINTS[cluster];
  const hotWalletAta = sol.tokenAddress({ mint, owner: hotWalletAddress, tokenProgram: sol.TOKEN_PROGRAM });
  const sinceUnix = Math.floor((sinceIso ? new Date(sinceIso).getTime() : Date.now() - 6 * 3600 * 1000) / 1000) - 60;
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
