// P0-5 Phase C1: who sent a USDC payment? The refund must go to the wallet
// that paid, so the sender is read from the confirmed transaction itself,
// never trusted from the client.
//
// resolveSenderFromParsedTx  pure: the transfer into our token account
//                             gives the instruction authority; the
//                             pre-balances give the owner of the account
//                             that was debited; both must name the same
//                             wallet, else the sender is unknown
// resolveSenderForSignature  fetches the transaction on the given cluster
//                             and adds a third reading, the on-chain owner
//                             of the source token account
//
// Rule: at least two readings present, and no two readings disagree.

import * as sol from "https://esm.sh/micro-sol-signer@0.8.2";
import { USDC_MINTS, type SolanaCluster } from "./cryptoNetworks.ts";

export {
  decideSender,
  readSenderFromParsedTx,
  resolveSenderFromParsedTx,
  type ParsedTxLike,
  type SenderReadings,
  type SenderResolution,
} from "./solanaSenderRules.ts";
import { decideSender as _decide, readSenderFromParsedTx as _read, type ParsedTxLike as _Tx, type SenderResolution as _Res } from "./solanaSenderRules.ts";

function rpcUrlFor(cluster: SolanaCluster): string {
  // The configured URL only applies to the configured cluster; a devnet
  // holding is read from devnet even while the platform runs on mainnet.
  const custom = Deno.env.get("SOLANA_RPC_URL");
  const configured = Deno.env.get("SOLANA_CLUSTER") === "mainnet-beta" ? "mainnet-beta" : "devnet";
  if (custom && configured === cluster) return custom;
  return cluster === "mainnet-beta" ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com";
}

async function rpcOn<T>(cluster: SolanaCluster, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrlFor(cluster), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`solana_http_${res.status}: ${text.slice(0, 200)}`);
  const body = JSON.parse(text);
  if (body.error) throw new Error(`solana_rpc_error: ${body.error.message ?? JSON.stringify(body.error)}`);
  return body.result as T;
}

/** Fetches the transaction on its cluster and resolves the sender with the on-chain source-account owner as the third reading. */
export async function resolveSenderForSignature(signature: string, cluster: SolanaCluster, hotWalletAddress: string): Promise<_Res> {
  const mint = USDC_MINTS[cluster];
  const hotWalletAta = sol.tokenAddress({ mint, owner: hotWalletAddress, tokenProgram: sol.TOKEN_PROGRAM });
  const tx = await rpcOn<_Tx | null>(cluster, "getTransaction", [
    signature,
    { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
  ]);
  if (!tx) return { authority: null, preBalanceOwner: null, sourceAta: null, payer: null, source: "unknown", reason: "transaction not found on " + cluster };
  const readings = _read(tx, mint, hotWalletAta, hotWalletAddress);
  if (readings.sourceAta) {
    try {
      const info = await rpcOn<{ value: { data?: { parsed?: { info?: { owner?: string } } } } | null }>(cluster, "getAccountInfo", [
        readings.sourceAta,
        { encoding: "jsonParsed" },
      ]);
      readings.accountOwner = info?.value?.data?.parsed?.info?.owner ?? null;
    } catch (err) {
      console.warn("[solanaSender] source account owner unavailable", readings.sourceAta, err);
      readings.accountOwner = null;
    }
  }
  return _decide(readings);
}
