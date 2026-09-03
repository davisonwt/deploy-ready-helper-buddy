// The 8 checks from sentinel.txt. Each is independent -- index.ts wraps
// every call in its own try/catch, so one check throwing never stops the
// rest. Every check returns the FULL current set of conditions it detects;
// report.ts's reconcileCheck() does the dedup/notify/resolve work.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  loadHotWalletKeypair,
  verifyHotWallet,
  getHotWalletUsdcBalance,
  getHotWalletSolBalance,
} from "../_shared/solanaPayout.ts";
import { getSolanaCluster } from "../_shared/cryptoNetworks.ts";
import type { Condition } from "./report.ts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ── 1. Cron health ─────────────────────────────────────────────────────
const CRON_JOBS = [
  { name: "payout-earnings-weekly", expectedIntervalMs: 7 * DAY_MS },
  { name: "sweep-hot-wallet-daily", expectedIntervalMs: DAY_MS },
];
const CRON_OVERDUE_GRACE_MS = 2 * HOUR_MS;

export async function checkCronHealth(admin: SupabaseClient): Promise<Condition[]> {
  const { data, error } = await admin.rpc("get_cron_job_health", {
    job_names: CRON_JOBS.map((j) => j.name),
  });
  if (error) throw error;
  const conditions: Condition[] = [];

  for (const job of CRON_JOBS) {
    const row = (data ?? []).find((r: any) => r.jobname === job.name);
    if (!row) {
      conditions.push({
        subject: job.name, severity: "critical",
        message: `Cron job '${job.name}' isn't scheduled at all (missing from cron.job).`,
      });
      continue;
    }
    if (!row.last_start) {
      conditions.push({
        subject: job.name, severity: "warn",
        message: `Cron job '${job.name}' has never run. If it was scheduled recently, its first slot may just not have arrived yet -- otherwise, confirm it's actually enabled.`,
      });
      continue;
    }
    if (row.last_status && row.last_status !== "succeeded") {
      conditions.push({
        subject: job.name, severity: "critical",
        message: `Cron job '${job.name}' last run did not succeed (status: ${row.last_status}, started ${row.last_start}).`,
        detail: { last_start: row.last_start, last_status: row.last_status },
      });
      continue;
    }
    const overdueMs = Date.now() - new Date(row.last_start).getTime() - job.expectedIntervalMs;
    if (overdueMs > CRON_OVERDUE_GRACE_MS) {
      conditions.push({
        subject: job.name, severity: "critical",
        message: `Cron job '${job.name}' is overdue -- last ran ${row.last_start}, expected roughly every ${Math.round(job.expectedIntervalMs / HOUR_MS)}h.`,
        detail: { last_start: row.last_start },
      });
    }
  }
  return conditions;
}

// ── 2. Stuck money ───────────────────────────────────────────────────────
export async function checkStuckMoney(admin: SupabaseClient): Promise<Condition[]> {
  const conditions: Condition[] = [];
  const oneHourAgo = new Date(Date.now() - HOUR_MS).toISOString();

  const { data: stuckPayouts, error: e1 } = await admin
    .from("payouts")
    .select("id, recipient_user_id, amount, currency, created_at")
    .eq("status", "processing")
    .lt("created_at", oneHourAgo);
  if (e1) throw e1;
  for (const p of stuckPayouts ?? []) {
    conditions.push({
      subject: `payout:${p.id}`, severity: "critical",
      message: `Payout ${p.id} stuck in 'processing' since ${p.created_at} (recipient ${p.recipient_user_id}, ${p.amount} ${p.currency}).`,
      detail: p,
    });
  }

  const { data: stuckEscrow, error: e2 } = await admin
    .from("product_bestowals")
    .select("id, sower_id, amount, auto_release_at")
    .lt("auto_release_at", new Date().toISOString())
    .is("released_at", null)
    .is("dispute_reason", null);
  if (e2) throw e2;
  for (const row of stuckEscrow ?? []) {
    conditions.push({
      subject: `escrow:${row.id}`, severity: "critical",
      message: `product_bestowals ${row.id} passed its auto-release time (${row.auto_release_at}) and is still held.`,
      detail: row,
    });
  }

  // Rows a payout run marks 'processing' while claiming them (see
  // markCoveredRowsProcessing, payout-earnings) that never made it to a
  // completed payout -- an interrupted run.
  const sourceChecks: { table: string; statusCol: string }[] = [
    { table: "product_bestowals", statusCol: "payout_status" },
    { table: "content_purchases", statusCol: "payout_status" },
    { table: "bestowals", statusCol: "payout_status" },
    { table: "whisperer_earnings", statusCol: "status" },
  ];
  for (const sc of sourceChecks) {
    const { data, error } = await admin
      .from(sc.table).select("id, created_at")
      .eq(sc.statusCol, "processing")
      .lt("created_at", oneHourAgo);
    if (error) { console.error(`sentinel: stuck-money check on ${sc.table} failed`, error); continue; }
    for (const row of data ?? []) {
      conditions.push({
        subject: `${sc.table}:${row.id}`, severity: "critical",
        message: `${sc.table} row ${row.id} has been '${sc.statusCol}=processing' since ${row.created_at} with no completed payout -- likely an interrupted payout-earnings run.`,
        detail: row,
      });
    }
  }
  return conditions;
}

// ── 3. Hot wallet ────────────────────────────────────────────────────────
// ~50 tx worth of SOL at the network's base fee (5000 lamports/signature =
// 0.00025 SOL for 50 tx), padded 4x for compute/priority fees. A padded
// threshold, not the bare theoretical minimum.
const SOL_FEE_FLOOR = 0.001;

export async function checkHotWallet(admin: SupabaseClient): Promise<Condition[]> {
  const conditions: Condition[] = [];
  let seed: Uint8Array;
  let derivedAddress: string;
  try {
    seed = loadHotWalletKeypair();
    ({ address: derivedAddress } = verifyHotWallet(seed));
  } catch (e) {
    conditions.push({
      subject: "hot_wallet_config", severity: "critical",
      message: `Hot wallet not configured, or the derived key doesn't match SOLANA_HOT_WALLET_ADDRESS: ${e instanceof Error ? e.message : String(e)}`,
    });
    return conditions;
  }

  const cluster = getSolanaCluster();
  const ceiling = Number(Deno.env.get("HOT_WALLET_CEILING_USD")) || 500;

  const [usdcBalance, solBalance] = await Promise.all([
    getHotWalletUsdcBalance(seed, cluster),
    getHotWalletSolBalance(seed),
  ]);

  if (usdcBalance > ceiling) {
    const { data: recentSweep } = await admin
      .from("treasury_sweeps")
      .select("id")
      .eq("status", "swept")
      .gte("created_at", new Date(Date.now() - DAY_MS).toISOString())
      .limit(1).maybeSingle();
    if (!recentSweep) {
      conditions.push({
        subject: "hot_wallet_over_ceiling", severity: "critical",
        message: `Hot wallet USDC balance ${usdcBalance} exceeds the $${ceiling} ceiling with no successful sweep in the last 24h.`,
        detail: { balance: usdcBalance, ceiling, cluster, address: derivedAddress },
      });
    }
  }

  if (solBalance < SOL_FEE_FLOOR) {
    conditions.push({
      subject: "hot_wallet_sol_low", severity: "warn",
      message: `Hot wallet SOL balance (${solBalance}) is low -- may not cover fees for its next ~50 sends.`,
      detail: { sol_balance: solBalance, floor: SOL_FEE_FLOOR, cluster },
    });
  }

  return conditions;
}

// ── 4. Edge function health ──────────────────────────────────────────────
// function_edge_logs / any log-analytics table is not reachable via SQL
// from this project (confirmed empty information_schema search,
// 2026-09-02), and the Management API's log-query endpoint was already
// confirmed unreliable earlier this session. This checks
// function_invocations instead -- a lightweight table these functions
// write to on failure only (see the migration). That gives a failure
// COUNT per hour, not a true error RATE (no reachable total-invocation
// denominator exists either) -- said explicitly in the message, not
// mislabeled.
const MONITORED_FUNCTIONS = [
  "update-crypto-payout", "payout-earnings", "sweep-hot-wallet", "release-escrow",
  "create-basket-bestowal-order", "create-wallet-topup", "capture-paypal-order",
  "paypal-webhook", "nowpayments-webhook", "moderate-media",
];
const FAILURE_COUNT_WARN = 5;
const FAILURE_COUNT_CRITICAL = 15;

export async function checkFunctionHealth(admin: SupabaseClient): Promise<Condition[]> {
  const conditions: Condition[] = [];
  const oneHourAgo = new Date(Date.now() - HOUR_MS).toISOString();
  for (const fn of MONITORED_FUNCTIONS) {
    const { count, error } = await admin
      .from("function_invocations")
      .select("id", { count: "exact", head: true })
      .eq("function_name", fn)
      .gte("created_at", oneHourAgo);
    if (error) { console.error(`sentinel: function_invocations check failed for ${fn}`, error); continue; }
    const n = count ?? 0;
    if (n >= FAILURE_COUNT_CRITICAL) {
      conditions.push({ subject: fn, severity: "critical", message: `${fn} logged ${n} failures in the last hour (failure count, not a rate -- no total-invocation source is reachable).`, detail: { count: n } });
    } else if (n >= FAILURE_COUNT_WARN) {
      conditions.push({ subject: fn, severity: "warn", message: `${fn} logged ${n} failures in the last hour (failure count, not a rate).`, detail: { count: n } });
    }
  }
  return conditions;
}

// ── 5. Unwatched queues ──────────────────────────────────────────────────
export async function checkQueues(admin: SupabaseClient): Promise<Condition[]> {
  const conditions: Condition[] = [];
  const dayAgo = new Date(Date.now() - DAY_MS).toISOString();
  const hourAgo = new Date(Date.now() - HOUR_MS).toISOString();

  const { data: reports, error: e1 } = await admin
    .from("content_reports").select("id, created_at, target_type")
    .is("resolved_at", null).lt("created_at", dayAgo);
  if (e1) throw e1;
  for (const r of reports ?? []) {
    conditions.push({ subject: `content_report:${r.id}`, severity: "warn", message: `content_reports ${r.id} (${r.target_type}) pending review since ${r.created_at} (>24h).` });
  }

  const { data: media, error: e2 } = await admin
    .from("media_moderation").select("id, verdict, created_at")
    .in("verdict", ["block", "uncertain"]).is("review_action", null).lt("created_at", dayAgo);
  if (e2) throw e2;
  for (const m of media ?? []) {
    conditions.push({ subject: `media_moderation:${m.id}`, severity: "warn", message: `media_moderation ${m.id} (${m.verdict}) unreviewed since ${m.created_at} (>24h).` });
  }

  const { data: critAbuse, error: e3 } = await admin
    .from("abuse_flags").select("id, category, created_at")
    .eq("severity", "critical").is("reviewed_at", null).lt("created_at", hourAgo);
  if (e3) throw e3;
  for (const a of critAbuse ?? []) {
    conditions.push({ subject: `abuse_flag:${a.id}`, severity: "critical", message: `abuse_flags ${a.id} (${a.category}, critical) unreviewed since ${a.created_at} (>1h).` });
  }

  // "Any minor_suspected row unreviewed at all" -- no age floor, highest severity, per spec.
  const { data: minorRows, error: e4 } = await admin
    .from("media_moderation").select("id, created_at")
    .eq("minor_suspected", true).is("review_action", null);
  if (e4) throw e4;
  for (const m of minorRows ?? []) {
    conditions.push({ subject: `minor_suspected:${m.id}`, severity: "critical", message: `media_moderation ${m.id} is minor_suspected and unreviewed (flagged ${m.created_at}) -- highest priority.` });
  }

  return conditions;
}

// ── 6. Third-party usage and cost ────────────────────────────────────────
// Sightengine's free-tier quota isn't a number I have verified for this
// account -- SIGHTENGINE_DAILY_LIMIT is left unset by default rather than
// guessing one. With it unset, this reports the raw count only (info,
// never alerts on a percentage it can't actually compute correctly).
// Supabase's own project usage has no API reachable from inside an edge
// function (that's a dashboard/Management-API-with-a-PAT concern, not a
// project secret) -- reported as a one-time info note instead of silently
// skipped.
export async function checkThirdPartyUsage(admin: SupabaseClient): Promise<Condition[]> {
  const conditions: Condition[] = [];
  const dayAgo = new Date(Date.now() - DAY_MS).toISOString();

  const { count, error } = await admin
    .from("media_moderation").select("id", { count: "exact", head: true })
    .gte("created_at", dayAgo);
  if (error) throw error;
  const calls = count ?? 0;

  const limitRaw = Deno.env.get("SIGHTENGINE_DAILY_LIMIT");
  const limit = limitRaw ? Number(limitRaw) : null;
  if (limit && limit > 0) {
    const pct = calls / limit;
    if (pct >= 1) {
      conditions.push({ subject: "sightengine_usage", severity: "critical", message: `Sightengine calls in the last 24h (${calls}) have reached or exceeded the configured limit (${limit}).`, detail: { calls, limit } });
    } else if (pct >= 0.8) {
      conditions.push({ subject: "sightengine_usage", severity: "warn", message: `Sightengine calls in the last 24h (${calls}) are at ${Math.round(pct * 100)}% of the configured limit (${limit}).`, detail: { calls, limit } });
    }
  } else {
    conditions.push({ subject: "sightengine_usage_unconfigured", severity: "info", message: `Sightengine calls in the last 24h: ${calls}. SIGHTENGINE_DAILY_LIMIT is not set, so usage can't be checked against a real quota yet.`, detail: { calls } });
  }

  conditions.push({ subject: "supabase_usage_unreachable", severity: "info", message: "Supabase's own project usage (DB size, egress, function invocations) has no API reachable from inside an edge function -- would need a dashboard check or a Management API call with a Personal Access Token, neither available here." });

  return conditions;
}

// ── 7. Config drift ──────────────────────────────────────────────────────
const MONEY_TABLES = ["payouts", "product_bestowals", "content_purchases", "bestowals", "profiles", "treasury_sweeps", "user_roles", "whisperer_earnings"];
const EXPECTED_TRIGGERS = ["abuse_detect_chat_message", "abuse_detect_product", "abuse_detect_profile", "abuse_detect_orchard", "abuse_repeat_offender", "wh_block_contact_info"];
const REQUIRED_SECRETS = ["SIGHTENGINE_API_USER", "SIGHTENGINE_API_SECRET", "SOLANA_HOT_WALLET_SECRET_KEY", "SOLANA_HOT_WALLET_ADDRESS", "CRON_SECRET", "SQUAD_VAULT_ADDRESS"];

export async function checkConfigDrift(admin: SupabaseClient): Promise<Condition[]> {
  const conditions: Condition[] = [];

  for (const name of REQUIRED_SECRETS) {
    if (!Deno.env.get(name)) {
      conditions.push({ subject: `secret:${name}`, severity: "critical", message: `Required secret ${name} is not set.` });
    }
  }

  const { data, error } = await admin.rpc("get_config_drift_signals", {
    money_tables: MONEY_TABLES,
    expected_triggers: EXPECTED_TRIGGERS,
  });
  if (error) throw error;

  const rls = data?.rls ?? {};
  for (const table of MONEY_TABLES) {
    if (rls[table] !== true) {
      conditions.push({ subject: `rls:${table}`, severity: "critical", message: `RLS is not enabled on '${table}' (expected on every money table).` });
    }
  }

  const triggers = data?.triggers ?? {};
  for (const tg of EXPECTED_TRIGGERS) {
    if (triggers[tg] !== true) {
      conditions.push({ subject: `trigger:${tg}`, severity: "critical", message: `Trigger '${tg}' is missing or disabled.` });
    }
  }

  if (data?.bootstrap_admin_executable_by_authenticated === true) {
    conditions.push({ subject: "grant_bootstrap_admin_executable", severity: "critical", message: "grant_bootstrap_admin is executable by the authenticated role again -- this was revoked as a wallet-hardening fix; a privileged function should never be directly callable by any logged-in user." });
  }

  return conditions;
}

// ── 8. Data sanity ───────────────────────────────────────────────────────
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkDataSanity(admin: SupabaseClient): Promise<Condition[]> {
  const conditions: Condition[] = [];

  // 8a. avatar_url wipes -- diffed against sentinel's own snapshot from
  // the previous run, since no audit trail exists anywhere else for this
  // column (confirmed during the 2026-09-02 avatar-wipe investigation).
  const { data: profiles, error: e1 } = await admin.from("profiles").select("user_id, avatar_url");
  if (e1) throw e1;
  const { data: prevWatch, error: e2 } = await admin.from("sentinel_avatar_watch").select("user_id, avatar_present, avatar_length, avatar_hash");
  if (e2) throw e2;
  const prevByUser = new Map((prevWatch ?? []).map((r: any) => [r.user_id, r]));

  const upserts: any[] = [];
  for (const p of profiles ?? []) {
    const present = !!p.avatar_url;
    const length = present ? p.avatar_url.length : null;
    const hash = present ? (await sha256Hex(p.avatar_url)).slice(0, 16) : null;
    const prev = prevByUser.get(p.user_id);

    if (prev && prev.avatar_present === true && present === false) {
      conditions.push({
        subject: `avatar_wipe:${p.user_id}`, severity: "warn",
        message: `profiles.avatar_url for user ${p.user_id} went from set to null since the last check.`,
        detail: { user_id: p.user_id, old_length: prev.avatar_length, old_hash_prefix: prev.avatar_hash },
      });
    }
    upserts.push({ user_id: p.user_id, avatar_present: present, avatar_length: length, avatar_hash: hash, checked_at: new Date().toISOString() });
  }
  if (upserts.length > 0) {
    const { error: upErr } = await admin.from("sentinel_avatar_watch").upsert(upserts, { onConflict: "user_id" });
    if (upErr) console.error("sentinel: avatar watch upsert failed", upErr);
  }

  // 8b. new admin/gosat role rows in the last 24h -- every one is
  // expected to be reviewed, not necessarily wrong.
  const dayAgo = new Date(Date.now() - DAY_MS).toISOString();
  const { data: newRoles, error: e3 } = await admin
    .from("user_roles").select("id, user_id, role, granted_by, created_at")
    .in("role", ["admin", "gosat"]).gte("created_at", dayAgo);
  if (e3) throw e3;
  for (const r of newRoles ?? []) {
    conditions.push({
      subject: `new_role:${r.id}`, severity: "warn",
      message: `${r.role} role granted to ${r.user_id} at ${r.created_at}${r.granted_by ? ` by ${r.granted_by}` : ""} -- confirm this was expected.`,
      detail: r,
    });
  }

  return conditions;
}

// ── 9. S2G Balance ledger ─────────────────────────────────────────────────
// spec-payments.md's S2G Balance section: balance_ledger is custodial --
// every dollar in it is backed by pooled USDC/PayPal funds, and the hot
// wallet's own on-chain balance must never fall below the total the ledger
// says Sow2Grow owes members. Note this checks the hot wallet only, not the
// 2-of-3 Squad -- the Squad's balance isn't queryable from here today (no
// multisig balance-read wired up anywhere in this codebase); flagged as an
// open gap rather than silently treated as covered.
export async function checkBalanceLedger(admin: SupabaseClient): Promise<Condition[]> {
  const conditions: Condition[] = [];

  const { data: ledgerRows, error: e1 } = await admin.from("balance_ledger").select("amount");
  if (e1) throw e1;
  const totalLiability = (ledgerRows ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  if (totalLiability > 0) {
    let seed: Uint8Array;
    try {
      seed = loadHotWalletKeypair();
      verifyHotWallet(seed);
    } catch (e) {
      conditions.push({
        subject: "balance_ledger_hot_wallet_config", severity: "critical",
        message: `Cannot verify hot wallet covers the ${totalLiability.toFixed(2)} USD S2G Balance liability -- hot wallet not configured: ${e instanceof Error ? e.message : String(e)}`,
      });
      return conditions;
    }
    const cluster = getSolanaCluster();
    const usdcBalance = await getHotWalletUsdcBalance(seed, cluster);
    if (usdcBalance < totalLiability) {
      conditions.push({
        subject: "balance_ledger_underfunded", severity: "critical",
        message: `Hot wallet USDC balance (${usdcBalance.toFixed(2)}) is below the S2G Balance liability (${totalLiability.toFixed(2)}) -- members could be owed more than Sow2Grow currently holds on this rail. Squad balance is not included in this check (not queryable from here) -- verify it directly too.`,
        detail: { usdc_balance: usdcBalance, total_liability: totalLiability, cluster },
      });
    }
  }

  // Withdrawal-sourced payouts stuck 'processing' past an hour are already
  // caught by checkStuckMoney's generic payouts scan above -- not
  // duplicated here.

  return conditions;
}
