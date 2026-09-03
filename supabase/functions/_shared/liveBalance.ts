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
const MAINNET_RPC = "https://api.mainnet-beta.solana.com";

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(MAINNET_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) {
    throw new Error(`Solana RPC ${method} failed: ${body.error.message ?? JSON.stringify(body.error)}`);
  }
  return body.result as T;
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
