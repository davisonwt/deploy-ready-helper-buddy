// Sweeps the hot wallet's USDC balance down to a fixed ceiling, moving the
// excess to the Squad (2-of-3) vault. spec-payments.md section 2: "a
// scheduled sweep moves S2G's cut from hot wallet to Squad (daily, or on
// threshold), leaving only near-term float exposed." Wallet-hardening
// audit item 1: "how much sits in the hot wallet, and is there a
// documented float ceiling? ... add a sweep ... log every sweep."
//
// This is a treasury movement, not a payout -- structurally separate from
// payout-earnings (spec-payments.md section 9: held/S2G-owned money must
// stay distinguishable "in the wallet layout AND in the ledger, not just
// conceptually"). Logs to treasury_sweeps, never payouts.
//
// Ceiling: HOT_WALLET_CEILING_USD env var, default $500 -- see the
// migration this shipped with (20260902160000_treasury_sweeps.sql) for
// the reasoning. Squad destination: SQUAD_VAULT_ADDRESS env var,
// REQUIRED, no hardcoded fallback -- same philosophy as
// SOLANA_HOT_WALLET_ADDRESS in _shared/solanaPayout.ts: a treasury
// destination is exactly the kind of value that must come from Supabase
// secrets, never a literal in source, even though spec-payments.md
// records today's real address for historical/documentation purposes.
//
// If the balance is over ceiling and the send itself fails, this alerts
// every gosat immediately (revenue sitting exposed, per spec). It does
// NOT detect "the sweep never even ran at all" -- that needs external
// cron-health monitoring (is this function being invoked on schedule?),
// a different, larger concern than this function can see from inside
// itself. This is the same class of gap as the NOWPayments IPN failure
// spec-payments.md already documents this project getting burned by once
// ("processed_webhooks sitting at 0 rows was never proof this was
// broken") -- flagged, not solved, here.
//
// Auth: CRON_SECRET (Authorization: Bearer, or legacy x-cron-secret),
// service-role bearer, or an admin/gosat user session -- same pattern as
// payout-earnings / release-escrow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";
import { getSolanaCluster } from "../_shared/cryptoNetworks.ts";
import {
  getHotWalletUsdcBalance,
  loadHotWalletKeypair,
  sendUsdcPayout,
  verifyHotWallet,
} from "../_shared/solanaPayout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const HOT_WALLET_CEILING_USD = Number(Deno.env.get("HOT_WALLET_CEILING_USD")) || 500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function alertGosats(admin: ReturnType<typeof createClient>, title: string, message: string) {
  const { data: gosats } = await admin.from("user_roles").select("user_id").in("role", ["admin", "gosat"]);
  const rows = (gosats ?? []).map((g: any) => ({
    user_id: g.user_id, type: "treasury_sweep", title, message, action_url: "/admin/moderation", is_read: false,
  }));
  if (rows.length > 0) await admin.from("user_notifications").insert(rows);
}

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
    if (CRON_SECRET && token && token === CRON_SECRET) { authorized = true; rateLimitId = "cron:sweep-hot-wallet"; }
    if (!authorized && CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) { authorized = true; rateLimitId = "cron:sweep-hot-wallet"; }
    if (!authorized && apikeyHeader && apikeyHeader === SERVICE_ROLE_KEY) { authorized = true; rateLimitId = "service:sweep-hot-wallet"; }
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

    const rlOk = await checkRateLimit(admin, rateLimitId!, "treasury_sweep", 30, 60, true);
    if (!rlOk) return createRateLimitResponse(3600);

    const squadVaultAddress = (Deno.env.get("SQUAD_VAULT_ADDRESS") ?? "").trim();
    if (!squadVaultAddress) {
      return json({ error: "SQUAD_VAULT_ADDRESS secret is not configured -- refusing to sweep with no destination." }, 500);
    }

    let sender: Uint8Array;
    let hotWalletAddress: string;
    try {
      sender = loadHotWalletKeypair();
      ({ address: hotWalletAddress } = verifyHotWallet(sender));
    } catch (setupErr) {
      const reason = setupErr instanceof Error ? setupErr.message : String(setupErr);
      console.error("sweep-hot-wallet: hot wallet not configured —", reason);
      return json({ error: "hot_wallet_not_configured", detail: reason }, 500);
    }

    const cluster = getSolanaCluster();
    const balance = await getHotWalletUsdcBalance(sender, cluster);

    if (balance <= HOT_WALLET_CEILING_USD) {
      return json({
        success: true, swept: false, reason: "under_ceiling",
        balance, ceiling: HOT_WALLET_CEILING_USD, cluster,
      });
    }

    const excess = Math.round((balance - HOT_WALLET_CEILING_USD) * 100) / 100;
    console.log(`sweep-hot-wallet: balance ${balance} USDC exceeds ceiling ${HOT_WALLET_CEILING_USD} — sweeping ${excess} to Squad ${squadVaultAddress}`);

    try {
      const { signature } = await sendUsdcPayout(sender, squadVaultAddress, excess);
      await admin.from("treasury_sweeps").insert({
        from_address: hotWalletAddress,
        to_address: squadVaultAddress,
        amount_usdc: excess,
        balance_before_usdc: balance,
        ceiling_usd: HOT_WALLET_CEILING_USD,
        solana_cluster: cluster,
        solana_tx_signature: signature,
        status: "swept",
        triggered_by: rateLimitId!,
      });
      return json({ success: true, swept: true, amount: excess, signature, cluster });
    } catch (sendErr) {
      const reason = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error("sweep-hot-wallet: SWEEP FAILED — balance exceeds ceiling and the send itself errored:", reason);
      await admin.from("treasury_sweeps").insert({
        from_address: hotWalletAddress,
        to_address: squadVaultAddress,
        amount_usdc: excess,
        balance_before_usdc: balance,
        ceiling_usd: HOT_WALLET_CEILING_USD,
        solana_cluster: cluster,
        status: "failed",
        error: reason,
        triggered_by: rateLimitId!,
      });
      // Per spec: "Alert if the balance exceeds its sweep threshold with
      // no sweep having run" -- this is the closest this function can get
      // to that from inside itself: the sweep WAS attempted and failed,
      // so the excess is still sitting exposed. Never silent about it.
      await alertGosats(
        admin,
        "URGENT: hot wallet sweep failed",
        `Hot wallet balance ${balance} USDC exceeds the ${HOT_WALLET_CEILING_USD} USDC ceiling and the sweep to Squad failed: ${reason}. Revenue is sitting exposed above the intended float. Review immediately.`,
      );
      return json({ error: "sweep_failed", detail: reason, balance, ceiling: HOT_WALLET_CEILING_USD }, 500);
    }
  } catch (err) {
    console.error("sweep-hot-wallet error", err);
    await logFunctionFailure("sweep-hot-wallet", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
