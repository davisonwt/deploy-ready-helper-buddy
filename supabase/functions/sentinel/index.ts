// sentinel -- hourly monitoring agent for S2G. Detects and reports only,
// never fixes anything itself. See sentinel.txt (the build spec) for the
// full check list and rationale; see checks.ts for each check's own
// reasoning and report.ts for the dedup/notify/resolve logic shared by all
// of them.
//
// Auth: CRON_SECRET (Authorization: Bearer, or legacy x-cron-secret),
// service-role via apikey header (new-style secret keys aren't JWTs, can't
// ride Authorization the way the legacy key could), or an admin/gosat user
// session -- same pattern as sweep-hot-wallet/release-escrow.
//
// Each of the 8 checks runs in its own try/catch: one check throwing never
// stops the rest, and the failure itself becomes a critical sentinel_events
// row (sentinel monitoring its own checks, not just the platform).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";
import {
  checkCronHealth, checkStuckMoney, checkHotWallet, checkFunctionHealth,
  checkQueues, checkThirdPartyUsage, checkConfigDrift, checkDataSanity,
  checkBalanceLedger,
} from "./checks.ts";
import { reconcileCheck, maybeDailyAllClear, type Condition } from "./report.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// A thrown Supabase/PostgREST error is a plain object ({message, code,
// details, hint}), not an Error instance -- String(e) on one collapses to
// the useless "[object Object]". Prefer .message, fall back to a real
// JSON.stringify (which at least shows the fields) before the last-resort
// String().
function errorDetail(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  try { return JSON.stringify(e); } catch { return String(e); }
}

const CHECKS: { name: string; run: (admin: ReturnType<typeof createClient>) => Promise<Condition[]> }[] = [
  { name: "cron_health", run: checkCronHealth },
  { name: "stuck_money", run: checkStuckMoney },
  { name: "hot_wallet", run: checkHotWallet },
  { name: "function_health", run: checkFunctionHealth },
  { name: "queues", run: checkQueues },
  { name: "third_party_usage", run: checkThirdPartyUsage },
  { name: "config_drift", run: checkConfigDrift },
  { name: "data_sanity", run: checkDataSanity },
  { name: "balance_ledger", run: checkBalanceLedger },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    // apikey header carries the service-role key (not a JWT under new-style
    // keys) -- Authorization stays reserved for a real user session.
    const apikeyHeader = req.headers.get("apikey") ?? "";

    let authorized = false;
    let rateLimitId: string | null = null;
    if (CRON_SECRET && token && token === CRON_SECRET) { authorized = true; rateLimitId = "cron:sentinel"; }
    if (!authorized && CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) { authorized = true; rateLimitId = "cron:sentinel"; }
    if (!authorized && apikeyHeader && apikeyHeader === SERVICE_ROLE_KEY) { authorized = true; rateLimitId = "service:sentinel"; }
    if (!authorized && token) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
        authorized = !!roles?.some((r: any) => ["admin", "gosat"].includes(r.role));
        if (authorized) rateLimitId = u.user.id;
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    const rlOk = await checkRateLimit(admin, rateLimitId!, "sentinel_run", 30, 60, true);
    if (!rlOk) return createRateLimitResponse(3600);

    const results: { check: string; ok: boolean; error?: string; conditions: number }[] = [];
    let openCritical = 0;
    let openWarn = 0;

    // Collected across the whole loop and reconciled ONCE at the end, not
    // per-failure inside it -- reconcileCheck resolves anything under a
    // check_name that's absent from what it's given, so calling it once per
    // individual failure (each call only knowing about that one subject)
    // would wrongly auto-resolve a DIFFERENT check's still-open failure
    // record, and a run with zero failures would never call it at all,
    // leaving a stale failure open forever once whatever caused it recovers.
    const selfCheckFailures: Condition[] = [];

    for (const check of CHECKS) {
      let conditions: Condition[] = [];
      try {
        conditions = await check.run(admin);
        await reconcileCheck(admin, check.name, conditions);
        results.push({ check: check.name, ok: true, conditions: conditions.length });
      } catch (e) {
        const detail = errorDetail(e);
        console.error(`sentinel: check '${check.name}' threw`, e);
        results.push({ check: check.name, ok: false, error: detail, conditions: 0 });
        selfCheckFailures.push({ subject: check.name, severity: "critical", message: `Sentinel check '${check.name}' itself failed to run: ${detail}` });
      }
    }

    // A check that can't even run is itself worth knowing about --
    // reconciled the same way as any other condition, under its own fixed
    // check name so it doesn't collide with any check's normal subjects.
    // Always called, even with an empty list -- that's what lets a
    // previously-failing check's record auto-resolve once it recovers.
    await reconcileCheck(admin, "sentinel_self_check_failure", selfCheckFailures);

    const { count: criticalCount } = await admin.from("sentinel_events").select("id", { count: "exact", head: true }).eq("status", "open").eq("severity", "critical");
    const { count: warnCount } = await admin.from("sentinel_events").select("id", { count: "exact", head: true }).eq("status", "open").eq("severity", "warn");
    openCritical = criticalCount ?? 0;
    openWarn = warnCount ?? 0;

    await maybeDailyAllClear(admin, openCritical, openWarn);

    return json({ ok: true, checks: results, open_critical: openCritical, open_warn: openWarn });
  } catch (err) {
    console.error("sentinel error", err);
    return json({ error: errorDetail(err) }, 500);
  }
});
