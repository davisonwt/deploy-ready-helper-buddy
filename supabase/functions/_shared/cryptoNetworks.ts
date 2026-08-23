// Central network/cluster configuration for the two supported payout rails.
//
// SECRETS YOU (the operator) MUST ADD IN Project Settings -> Secrets before any
// real transfer can be signed. None of these exist yet and none are hardcoded:
//
//   SOLANA_SENDER_PRIVATE_KEY  base58-encoded 64-byte Solana keypair secret key
//                              (what Phantom exports as "private key"), OR a
//                              JSON array of 64 numbers.
//   XRP_SENDER_SEED            XRP Ledger family seed of the sending account
//                              (starts with "s...").
//
// Optional overrides (defaults are TESTNETS on purpose):
//   SOLANA_CLUSTER   "devnet" (default) | "mainnet-beta"
//   SOLANA_RPC_URL   custom RPC endpoint; overrides the cluster default URL
//   XRP_NETWORK      "testnet" (default) | "mainnet"
//   XRP_RPC_URL      custom rippled websocket endpoint
//
// Flip to mainnet ONLY after a successful devnet/testnet dry run.

export type SolanaCluster = "devnet" | "mainnet-beta";
export type XrpNetwork = "testnet" | "mainnet";

// USDC SPL mint addresses, verified against Circle's official contract-address
// documentation (https://developers.circle.com/stablecoins/usdc-contract-addresses).
export const USDC_MINTS: Record<SolanaCluster, string> = {
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
};

export function getSolanaCluster(): SolanaCluster {
  return Deno.env.get("SOLANA_CLUSTER") === "mainnet-beta" ? "mainnet-beta" : "devnet";
}

export function getSolanaRpcUrl(): string {
  const custom = Deno.env.get("SOLANA_RPC_URL");
  if (custom) return custom;
  return getSolanaCluster() === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";
}

export function getXrpNetwork(): XrpNetwork {
  return Deno.env.get("XRP_NETWORK") === "mainnet" ? "mainnet" : "testnet";
}

export function getXrpRpcUrl(): string {
  const custom = Deno.env.get("XRP_RPC_URL");
  if (custom) return custom;
  return getXrpNetwork() === "mainnet"
    ? "wss://xrplcluster.com"
    : "wss://s.altnet.rippletest.net:51233";
}

/** Small summary the UI uses to render the "TEST MODE" banner. */
export function networkModeSummary() {
  const solanaCluster = getSolanaCluster();
  const xrpNetwork = getXrpNetwork();
  return {
    solana_cluster: solanaCluster,
    xrp_network: xrpNetwork,
    is_testnet: solanaCluster !== "mainnet-beta" || xrpNetwork !== "mainnet",
  };
}
