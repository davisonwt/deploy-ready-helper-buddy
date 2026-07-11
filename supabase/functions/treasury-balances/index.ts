// Gosat-only treasury view: returns the platform's custody balances from
// NOWPayments and PayPal, plus computed "reserved for sowers" and "platform net".
//
// Auth: caller MUST be signed in AND have a `gosat` role in public.user_roles.
// Verification is done with the service-role client so RLS cannot be bypassed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getPaypalAccessToken, paypalBaseUrl } from "../_shared/paypal/client.ts";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
const SOLANA_RPC = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com";
const USDC_SPL_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

interface NPBalanceEntry {
  amount?: number;
  pendingAmount?: number;
}
interface NPBalanceResponse {
  currencies?: Record<string, NPBalanceEntry>;
}

interface OrgWalletBalance {
  wallet_name: string;
  label: string;
  blockchain: string;
  address: string;
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

const WALLET_LABELS: Record<string, string> = {
  s2gholding: "Main (s2gholding)",
  s2gbestow: "Tithing (s2gbestow)",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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

    // ---- NOWPayments balance (auth -> /v1/balance) ----
    const npEmail = Deno.env.get("NOWPAYMENTS_EMAIL");
    const npPassword = Deno.env.get("NOWPAYMENTS_PASSWORD");
    let nowpayments: {
      ok: boolean;
      error?: string;
      currencies?: Array<{ currency: string; available: number; pending: number }>;
    } = { ok: false, error: "not_configured" };

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

        const balRes = await fetch(`${NOWPAYMENTS_API}/balance`, {
          headers: { Authorization: `Bearer ${authJson.token}` },
        });
        const balText = await balRes.text();
        if (!balRes.ok) throw new Error(`balance_http_${balRes.status}: ${balText}`);
        const balJson = JSON.parse(balText) as NPBalanceResponse;

        const currencies = Object.entries(balJson.currencies ?? {})
          .map(([code, v]) => ({
            currency: code.toUpperCase(),
            available: Number(v?.amount ?? 0),
            pending: Number(v?.pendingAmount ?? 0),
          }))
          .filter((e) => e.available > 0 || e.pending > 0)
          .sort((a, b) => b.available - a.available);

        nowpayments = { ok: true, currencies };
      } catch (err) {
        console.error("nowpayments balance failed", err);
        nowpayments = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    // ---- PayPal balance ----
    let paypal: {
      ok: boolean;
      error?: string;
      balances?: Array<{ currency: string; available: number; total: number }>;
    } = { ok: false, error: "not_configured" };

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
      paypal = { ok: true, balances };
    } catch (err) {
      console.error("paypal balance failed", err);
      paypal = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    // ---- Reserved for sowers (sum of on-platform balances) ----
    const { data: balRows } = await service
      .from("sower_balances")
      .select("available_balance, pending_balance, currency");
    let reservedAvailable = 0;
    let reservedPending = 0;
    for (const r of balRows ?? []) {
      reservedAvailable += Number(r.available_balance ?? 0);
      reservedPending += Number(r.pending_balance ?? 0);
    }

    // Rough USD custody total (sums numeric values across currencies — display only).
    const npUsdLike = (nowpayments.currencies ?? [])
      .filter((c) => ["USDC","USDT","USD","DAI","BUSD"].includes(c.currency))
      .reduce((acc, c) => acc + c.available + c.pending, 0);
    const ppUsd = (paypal.balances ?? [])
      .filter((b) => b.currency === "USD")
      .reduce((acc, b) => acc + b.total, 0);
    const custodyTotalUsd = npUsdLike + ppUsd;
    const reservedTotal = reservedAvailable + reservedPending;
    const platformNetUsd = custodyTotalUsd - reservedTotal;

    // ---- Organization wallets (main + tithing) with live Solana balances ----
    const orgWallets: OrgWalletBalance[] = [];
    const { data: orgRows } = await service
      .from("organization_wallets")
      .select("wallet_name, blockchain, wallet_address, is_active")
      .eq("is_active", true);
    for (const row of orgRows ?? []) {
      const address = row.wallet_address as string | null;
      const blockchain = (row.blockchain as string | null) ?? "unknown";
      const name = row.wallet_name as string;
      const entry: OrgWalletBalance = {
        wallet_name: name,
        label: WALLET_LABELS[name] ?? name,
        blockchain,
        address: address ?? "",
        sol: 0,
        usdc: 0,
        ok: false,
      };
      if (!address) {
        entry.error = "no_address";
        orgWallets.push(entry);
        continue;
      }
      if (blockchain !== "solana") {
        entry.error = `unsupported_chain_${blockchain}`;
        orgWallets.push(entry);
        continue;
      }
      try {
        const bal = await loadSolanaWalletBalance(address);
        entry.sol = bal.sol;
        entry.usdc = bal.usdc;
        entry.ok = true;
      } catch (err) {
        entry.error = err instanceof Error ? err.message : String(err);
      }
      orgWallets.push(entry);
    }

    return json({
      generatedAt: new Date().toISOString(),
      nowpayments,
      paypal,
      orgWallets,
      reserved: {
        available: reservedAvailable,
        pending: reservedPending,
        currency: "USD",
      },
      summary: {
        custodyTotalUsd,
        reservedForSowersUsd: reservedTotal,
        platformNetUsd,
        notice:
          "Sow2Grow does not currently hold a separate fee wallet. Platform net is computed (custody − reserved for sowers), not held in a distinct account. To enforce a hard split, create a second NOWPayments sub-account and route the platform's % there at distribution time.",
      },
    });
  } catch (err) {
    console.error("treasury-balances error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
