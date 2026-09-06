// Gosat-only treasury view (BOOKKEEPING-PLAN.md section 4, Phase 2):
// the three buckets from public.liability_snapshot(), the live balances of
// the four named wallets + PayPal, the per-wallet expectation, and the
// reconciliation verdict (GREEN / RED) from _shared/liabilityRules.ts,
// the TypeScript twin of public.treasury_verdict().
//
// Auth: caller MUST be signed in AND have a `gosat` role in public.user_roles.
// Read-only: this page observes, it never moves money.
//
// Retired 2026-09-06: the legacy organization_wallets rows (s2gholding /
// s2gbestow, NOWPayments era) are no longer fetched or shown. The rows stay
// in the table because _shared/distribution.ts still snapshots them into
// orchard distribution_data; that reference goes with orchard Phase B.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getPaypalAccessToken, paypalBaseUrl } from "../_shared/paypal/client.ts";
import { paypalEnvironment } from "../_shared/revenue.ts";
import {
  treasuryVerdict,
  verdictSentence,
  walletExpectations,
  type SnapshotForWallets,
  type WalletName,
} from "../_shared/liabilityRules.ts";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
const SOLANA_RPC = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com";
const USDC_SPL_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// The four named wallets (spec-payments.md sections 2 and 10). Addresses
// come from secrets where one exists, else the documented address.
const WALLETS: Array<{ name: WalletName; label: string; address: string; note: string }> = [
  {
    name: "hot",
    label: "Hot wallet",
    address: (Deno.env.get("SOLANA_HOT_WALLET_ADDRESS") ?? "6zbpF3HQbxFVMfUPMRzZZ52nwA7PSvqeq2Cqibq2BcxZ").trim(),
    note: "Working float: payments in, payouts out. Single key.",
  },
  {
    name: "squad",
    label: "Squad vault (2-of-3)",
    address: (Deno.env.get("SQUAD_VAULT_ADDRESS") ?? "BjBY4uCCEQfE66rYddTBUn9Twg7jKevH1Rze8UfZFWLs").trim(),
    note: "S2G's own accumulated fees, swept from the hot wallet.",
  },
  {
    name: "launch",
    label: "Launch Orchard wallet",
    address: (Deno.env.get("LAUNCH_ORCHARD_WALLET_ADDRESS") ?? "13M2yVLWFmm2VeU1SD5PPPzJwBGUR3eny6Mbvdx3ztct").trim(),
    note: "Held for Launch orchards once holdings move off the hot wallet. Not S2G's.",
  },
  {
    name: "uplift",
    label: "Uplift Orchard wallet",
    address: (Deno.env.get("UPLIFT_ORCHARD_WALLET_ADDRESS") ?? "8Aj2bWN4eDxvGiWPNbCuJXvtH5pL3ZHNGeFdcahRMVRD").trim(),
    note: "Held for Uplift orchards. Not S2G's.",
  },
];

interface WalletBalance {
  name: WalletName;
  label: string;
  address: string;
  note: string;
  sol: number;
  usdc: number;
  ok: boolean;
  error?: string;
}

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`solana_http_${res.status}: ${text}`);
  const parsed = JSON.parse(text);
  if (parsed.error) throw new Error(`solana_rpc_error: ${JSON.stringify(parsed.error)}`);
  return parsed.result as T;
}

async function loadSolanaWalletBalance(address: string): Promise<{ sol: number; usdc: number }> {
  const lamports = await solanaRpc<{ value: number }>("getBalance", [address]);
  const sol = Number(lamports?.value ?? 0) / 1e9;
  const tokens = await solanaRpc<{ value: Array<{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } } }> }>(
    "getTokenAccountsByOwner",
    [address, { mint: USDC_SPL_MINT }, { encoding: "jsonParsed" }],
  );
  let usdc = 0;
  for (const t of tokens?.value ?? []) {
    usdc += Number(t?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0);
  }
  return { sol, usdc };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
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

    // ---- AuthN ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

    // ---- AuthZ: gosat role check via service-role read ----
    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: roleRow } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "gosat")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden", message: "gosat role required" }, 403);

    // ---- The books: liability snapshot, live + the test environments ----
    const { data: snapshot, error: snapErr } = await service.rpc("liability_snapshot", { _environment: "live" });
    if (snapErr || !snapshot) {
      // Logged AND returned: the page shows `detail`, the function logs keep it.
      console.error("treasury-balances: liability_snapshot failed", snapErr?.code, snapErr?.message, snapErr?.details, snapErr?.hint);
      return json({
        error: "liability_snapshot_failed",
        message: `The liability snapshot could not be read: ${snapErr?.message ?? "no data returned"}`,
        detail: snapErr?.message ?? "no data",
        code: snapErr?.code ?? null,
      }, 500);
    }
    const { data: devnetSnapshot } = await service.rpc("liability_snapshot", { _environment: "devnet" });

    // ---- The four wallets, on-chain (mainnet) ----
    const wallets: WalletBalance[] = [];
    for (const w of WALLETS) {
      const entry: WalletBalance = { ...w, sol: 0, usdc: 0, ok: false };
      if (!w.address) {
        entry.error = "no_address";
      } else {
        try {
          const bal = await loadSolanaWalletBalance(w.address);
          entry.sol = bal.sol;
          entry.usdc = bal.usdc;
          entry.ok = true;
        } catch (err) {
          entry.error = err instanceof Error ? err.message : String(err);
        }
      }
      wallets.push(entry);
    }

    // ---- PayPal balance, labelled live / sandbox from PAYPAL_ENV ----
    const paypalEnv = paypalEnvironment(); // 'live' | 'sandbox'
    let paypal: {
      ok: boolean;
      environment: "live" | "sandbox";
      error?: string;
      balances?: Array<{ currency: string; available: number; total: number }>;
      availableUsd: number;
    } = { ok: false, environment: paypalEnv, error: "not_configured", availableUsd: 0 };
    try {
      const accessToken = await getPaypalAccessToken();
      const url = `${paypalBaseUrl()}/v1/reporting/balances?currency_code=ALL`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`paypal_balance_http_${res.status}: ${text}`);
      const parsed = JSON.parse(text) as {
        balances?: Array<{
          currency?: string;
          available_balance?: { value?: string; currency_code?: string };
          total_balance?: { value?: string; currency_code?: string };
        }>;
      };
      const balances = (parsed.balances ?? []).map((b) => ({
        currency: b.currency ?? b.available_balance?.currency_code ?? "USD",
        available: Number(b.available_balance?.value ?? 0),
        total: Number(b.total_balance?.value ?? 0),
      }));
      const availableUsd = balances.filter((b) => b.currency === "USD").reduce((acc, b) => acc + b.available, 0);
      paypal = { ok: true, environment: paypalEnv, balances, availableUsd };
    } catch (err) {
      console.error("paypal balance failed", err);
      paypal = { ok: false, environment: paypalEnv, error: err instanceof Error ? err.message : String(err), availableUsd: 0 };
    }

    // ---- NOWPayments (legacy; shown only if it still holds something) ----
    let nowpayments: { ok: boolean; error?: string; currencies?: Array<{ currency: string; available: number; pending: number }> } =
      { ok: false, error: "not_configured" };
    const npEmail = Deno.env.get("NOWPAYMENTS_EMAIL");
    const npPassword = Deno.env.get("NOWPAYMENTS_PASSWORD");
    if (npEmail && npPassword) {
      try {
        const authRes = await fetch(`${NOWPAYMENTS_API}/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: npEmail, password: npPassword }),
        });
        const authText = await authRes.text();
        if (!authRes.ok) throw new Error(`auth_http_${authRes.status}: ${authText}`);
        const authJson = JSON.parse(authText) as { token?: string };
        if (!authJson.token) throw new Error("no_jwt_token");
        const balRes = await fetch(`${NOWPAYMENTS_API}/balance`, { headers: { Authorization: `Bearer ${authJson.token}` } });
        const balText = await balRes.text();
        if (!balRes.ok) throw new Error(`balance_http_${balRes.status}: ${balText}`);
        const balJson = JSON.parse(balText) as { currencies?: Record<string, { amount?: number; pendingAmount?: number }> };
        const currencies = Object.entries(balJson.currencies ?? {})
          .map(([code, v]) => ({ currency: code.toUpperCase(), available: Number(v?.amount ?? 0), pending: Number(v?.pendingAmount ?? 0) }))
          .filter((e) => e.available > 0 || e.pending > 0)
          .sort((a, b) => b.available - a.available);
        nowpayments = { ok: true, currencies };
      } catch (err) {
        console.error("nowpayments balance failed", err);
        nowpayments = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    // ---- Reconciliation ----
    // Live assets = the four wallets' mainnet USDC + PayPal available USD,
    // but only when PayPal is live: a sandbox balance is not money.
    const walletUsdc = wallets.reduce((s, w) => s + (w.ok ? w.usdc : 0), 0);
    const paypalCounted = paypal.ok && paypal.environment === "live" ? paypal.availableUsd : 0;
    const assetsUsd = round2(walletUsdc + paypalCounted);
    const walletsUnreadable = wallets.filter((w) => !w.ok).map((w) => w.name);

    const snap = snapshot as SnapshotForWallets & Record<string, unknown>;
    const verdict = treasuryVerdict({
      assetsUsd,
      liabilitiesUsd: Number(snap.liabilities_total ?? 0),
      s2gOwnUsd: Number(snap.s2g_own?.operating_net ?? 0),
      unrecordedUsd: Number(snap.unrecorded?.solana_processor_fees ?? 0),
      recordedFloatUsd: Number(snap.recorded_float?.total ?? 0),
    });
    const expectations = walletExpectations(snap);
    const actualByWallet: Record<string, number> = {
      hot: wallets.find((w) => w.name === "hot")?.usdc ?? 0,
      squad: wallets.find((w) => w.name === "squad")?.usdc ?? 0,
      launch: wallets.find((w) => w.name === "launch")?.usdc ?? 0,
      uplift: wallets.find((w) => w.name === "uplift")?.usdc ?? 0,
      paypal: paypalCounted,
    };
    const perWallet = expectations.wallets.map((e) => ({
      ...e,
      actual: round2(actualByWallet[e.wallet] ?? 0),
      difference: round2((actualByWallet[e.wallet] ?? 0) - e.expected),
    }));

    const gapComponents = [
      { label: "SOL gas float (not USDC, excluded from every USD figure)", amount: round2(wallets.reduce((s, w) => s + (w.ok ? w.sol : 0), 0)), unit: "SOL" },
      { label: "Solana processor fees received, S2G's, not in the ledger until phase 4", amount: verdict.unrecorded, unit: "USD" },
      { label: "Float and gas recorded by a gosat (treasury_movements)", amount: verdict.recorded_float, unit: "USD" },
      { label: "Test-environment money (devnet / sandbox), excluded from the live figures", amount: round2(Number((devnetSnapshot as { liabilities_total?: number } | null)?.liabilities_total ?? 0)), unit: "USD" },
    ];

    return json({
      generatedAt: new Date().toISOString(),
      environment: "live",
      snapshot,
      devnetSnapshot: devnetSnapshot ?? null,
      wallets,
      paypal,
      nowpayments,
      assets: { totalUsd: assetsUsd, walletUsdc: round2(walletUsdc), paypalUsd: paypalCounted, paypalCounted: paypal.ok && paypal.environment === "live", unreadable: walletsUnreadable },
      reconciliation: {
        ...verdict,
        sentence: verdictSentence(verdict, "live"),
        partial: walletsUnreadable.length > 0 || !paypal.ok,
        gapComponents,
        perWallet,
        unplaced: expectations.unplaced,
      },
    });
  } catch (err) {
    console.error("treasury-balances error", err);
    return json({
      error: "treasury_balances_failed",
      message: err instanceof Error ? err.message : String(err),
      detail: err instanceof Error ? (err.stack ?? err.message) : String(err),
    }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
