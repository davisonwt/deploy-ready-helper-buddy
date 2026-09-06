// Live, read-only on-chain USDC balance for an arbitrary Solana wallet
// address -- always mainnet, since a member's own external wallet only
// meaningfully exists there regardless of SOLANA_CLUSTER (the platform's
// own pay-in/payout rail may still be on devnet).
//
// This exists because api.mainnet-beta.solana.com does NOT send CORS
// headers permitting direct browser fetch() from an arbitrary origin --
// confirmed by reproducing the exact failure ("TypeError: Failed to
// fetch", no further detail, the standard opaque CORS-block signature) in
// a real browser context. src/lib/payments/liveWalletBalance.ts used to
// call that RPC directly from the browser and silently cached a false "0"
// balance for every user, every time -- this edge function is the fix:
// the browser calls US (same-origin, we control CORS), and we call
// Solana's RPC server-side, where CORS doesn't apply at all.
//
// Same ATA-derive + getAccountInfo + decode shape as
// _shared/solanaPayout.ts's getHotWalletUsdcBalance -- just parameterized
// on an arbitrary owner address instead of a locally-held secret key.
import * as sol from "https://esm.sh/micro-sol-signer@0.8.2";
import { USDC_MINTS } from "./cryptoNetworks.ts";

const USDC_DECIMALS = 6;
const PUBLIC_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

/** The configured RPC when it is a mainnet one, else the public endpoint. */
function mainnetRpcUrl(): string {
  const custom = (Deno.env.get("SOLANA_RPC_URL") ?? "").trim();
  if (custom && Deno.env.get("SOLANA_CLUSTER") === "mainnet-beta") return custom;
  return PUBLIC_MAINNET_RPC;
}

/** Thrown when the RPC refuses us (429/403) or answers with something that is not JSON-RPC: retryable, not a code bug. */
export class RpcUnavailableError extends Error {
  readonly status: number;
  constructor(status: number, detail: string) {
    super(`Solana RPC unavailable (HTTP ${status}): ${detail}`);
    this.name = "RpcUnavailableError";
    this.status = status;
  }
}

// 2026-09-06: the public RPC rate-limits shared egress IPs (429, sometimes
// 403 with an HTML body). res.json() on that body used to throw a bare
// SyntaxError that surfaced as an opaque 500. Now: one short retry, then a
// typed, retryable error the function maps to 503.
async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400));
    const res = await fetch(mainnetRpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const text = await res.text();
    if (res.status === 429 || res.status === 403 || res.status >= 500) {
      lastErr = new RpcUnavailableError(res.status, text.slice(0, 120).replace(/\s+/g, " ") || res.statusText);
      continue;
    }
    let body: { result?: T; error?: { message?: string } };
    try {
      body = JSON.parse(text);
    } catch {
      lastErr = new RpcUnavailableError(res.status, `non-JSON answer: ${text.slice(0, 80)}`);
      continue;
    }
    if (body.error) {
      throw new Error(`Solana RPC ${method} failed: ${body.error.message ?? JSON.stringify(body.error)}`);
    }
    return body.result as T;
  }
  throw lastErr ?? new RpcUnavailableError(0, "no answer");
}

export async function getLiveUsdcBalance(owner: string): Promise<number> {
  const mint = USDC_MINTS["mainnet-beta"];
  const ata = sol.tokenAddress({ mint, owner, tokenProgram: sol.TOKEN_PROGRAM });

  const info = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [
    ata,
    { encoding: "base64", commitment: "confirmed" },
  ]);
  if (!info.value) return 0; // No token account yet == a real, valid zero -- not an error.

  const [b64] = info.value.data;
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const decoded = sol.TokenAccount(raw);
  if (decoded.TAG !== "token") return 0;
  return Number(decoded.data.amount) / 10 ** USDC_DECIMALS;
}
