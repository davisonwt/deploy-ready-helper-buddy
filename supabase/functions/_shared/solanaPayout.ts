// Hot-wallet Solana USDC sending, used by payout-earnings' Solana rail.
// spec-payments.md section 2: this is the single-key HOT WALLET, never the
// 2-of-3 Squad -- a multisig can't sign an automated instant payout.
//
// NO @solana/web3.js / @solana/spl-token here, on purpose. Both were
// measured costing ~3s of CPU to import/evaluate under Supabase's edge
// runtime, which has a hard, non-configurable 2s CPU-time-per-request
// ceiling on every plan (Free/Pro/Team/Enterprise, confirmed against
// Supabase's own docs) -- payout-earnings' Solana leg failed outright
// because of it, dry_run included, every time.
//
// Replaced with micro-sol-signer (github.com/paulmillr/micro-sol-signer),
// built on @noble/curves/@scure -- the same author's minimal, audited
// primitives used elsewhere as the lightweight alternative to full SDKs.
// Measured cost on this runtime: 80ms cpu_time_used (via a throwaway
// probe function, same log field used to diagnose the original failure)
// -- ~25x headroom under the 2s budget. That headroom is also why this is
// a STATIC top-level import rather than a lazy `await import()`: at 80ms
// there's no meaningful boot-cost left to defer, and a static import
// fails the same way on every single invocation -- loud and consistent at
// deploy time -- rather than only on the first request that happens to
// touch a Solana recipient.
//
// micro-sol-signer does no network I/O itself ("no real network calls are
// done in the library, for simplified auditing") -- every RPC call below
// (blockhash, submit, confirm, balance) is a plain fetch() against the
// configured Solana JSON-RPC endpoint, same as before.
//
// SECRETS (Project Settings -> Secrets):
//
//   SOLANA_HOT_WALLET_SECRET_KEY   REQUIRED. Base58-encoded 64-byte Solana
//                                  secret key -- exactly what Phantom's
//                                  "Export Private Key" gives you: a
//                                  32-byte ed25519 seed followed by its
//                                  32-byte public key, concatenated. A
//                                  JSON array of 64 numbers is also
//                                  accepted. micro-sol-signer's signing
//                                  functions take only the 32-byte SEED --
//                                  see loadHotWalletKeypair() below. This
//                                  is the one detail here that's easy to
//                                  get silently wrong: slicing the wrong
//                                  32 bytes derives a DIFFERENT keypair
//                                  with no error at that point.
//                                  verifyHotWallet() is the actual safety
//                                  net -- it re-derives the address from
//                                  whatever bytes were used and refuses to
//                                  proceed on any mismatch against
//                                  SOLANA_HOT_WALLET_ADDRESS below.
//
//   SOLANA_HOT_WALLET_ADDRESS      REQUIRED. The wallet's public address
//                                  (base58), stored separately so the code
//                                  can log and sanity-check which wallet
//                                  it's about to send from on every run
//                                  without re-deriving it from the secret
//                                  key each call. A mismatch is treated as
//                                  a configuration error and the whole
//                                  Solana leg of the run is refused.
//
// Cluster defaults to devnet (see _shared/cryptoNetworks.ts) -- nothing
// here points at mainnet unless SOLANA_CLUSTER=mainnet-beta is set.

import * as sol from "https://esm.sh/micro-sol-signer@0.8.2";
import bs58 from "https://esm.sh/bs58@5.0.0";
import { validateSolanaAddress } from "./cryptoAddress.ts";
import { USDC_MINTS, getSolanaCluster, getSolanaRpcUrl, type SolanaCluster } from "./cryptoNetworks.ts";

// USDC's decimals are fixed at mint creation and cannot change afterward
// for an existing SPL mint -- there's no live value to "drift" the way an
// account balance can, so hardcoding this (rather than fetching the mint
// account and parsing it out) is standard practice, not a shortcut.
// IMPORTANT: this is the one place a mistake costs real money with
// nothing on-chain to catch it. TransferChecked's own decimals argument
// is checked against the MINT we specify -- it protects against sending
// to the wrong mint, not against our own arithmetic being wrong. Getting
// this constant wrong (or getting the dollars->raw-units math below
// wrong) sends a silently-wrong amount that still succeeds on-chain.
const USDC_DECIMALS = 6;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(getSolanaRpcUrl(), {
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

/**
 * Returns the 32-byte ed25519 seed micro-sol-signer's signing functions
 * expect, sliced from the 64-byte SOLANA_HOT_WALLET_SECRET_KEY as stored
 * (see the file header for why this slice matters).
 */
export function loadHotWalletKeypair(): Uint8Array {
  const raw = Deno.env.get("SOLANA_HOT_WALLET_SECRET_KEY");
  if (!raw) {
    throw new Error(
      "SOLANA_HOT_WALLET_SECRET_KEY secret is not configured -- add it in Project Settings -> Secrets " +
        "(base58 string, e.g. Phantom's 'Export Private Key', or a JSON array of 64 numbers).",
    );
  }
  const trimmed = raw.trim();
  const bytes = trimmed.startsWith("[")
    ? Uint8Array.from(JSON.parse(trimmed))
    : bs58.decode(trimmed);
  if (bytes.length !== 64) {
    throw new Error(
      `SOLANA_HOT_WALLET_SECRET_KEY decoded to ${bytes.length} bytes, expected 64 (32-byte seed + 32-byte public key).`,
    );
  }
  return bytes.slice(0, 32);
}

/**
 * Confirms the configured SOLANA_HOT_WALLET_ADDRESS actually matches the
 * public key `seed` derives to. A mismatch means the two secrets were set
 * inconsistently (e.g. the key was rotated and the address wasn't, or the
 * seed was sliced wrong) -- refuse to send rather than silently sending
 * from a wallet nobody logged or verified.
 */
export function verifyHotWallet(seed: Uint8Array): { address: string } {
  const configured = (Deno.env.get("SOLANA_HOT_WALLET_ADDRESS") ?? "").trim();
  if (!configured) {
    throw new Error(
      "SOLANA_HOT_WALLET_ADDRESS secret is not configured -- add the hot wallet's public address " +
        "in Project Settings -> Secrets so sends can be verified without re-deriving it every call.",
    );
  }
  const derived = sol.getAddress(seed);
  if (derived !== configured) {
    throw new Error(
      `SOLANA_HOT_WALLET_ADDRESS (${configured}) does not match the address SOLANA_HOT_WALLET_SECRET_KEY ` +
        `actually derives to (${derived}). Refusing to send -- this is a configuration error, not a network error.`,
    );
  }
  return { address: derived };
}

export interface HotWalletCheckResult {
  configured: true;
  derived_address: string;
  configured_address: string | null;
  address_matches: boolean;
}

/**
 * Decodes SOLANA_HOT_WALLET_SECRET_KEY and derives its public key, compared
 * against SOLANA_HOT_WALLET_ADDRESS -- WITHOUT throwing on a mismatch, so a
 * caller (the dry-run path) can report the result instead of failing the
 * whole request over it. Still throws if the secret key itself is missing
 * or malformed -- there's nothing to report in that case. Never returns or
 * logs the secret key itself, only the public address it derives to.
 */
export function checkHotWalletConfig(): HotWalletCheckResult {
  const seed = loadHotWalletKeypair();
  const derived = sol.getAddress(seed);
  const configured = (Deno.env.get("SOLANA_HOT_WALLET_ADDRESS") ?? "").trim() || null;
  return {
    configured: true,
    derived_address: derived,
    configured_address: configured,
    address_matches: !!configured && configured === derived,
  };
}

/** Current USDC balance held in the hot wallet's associated token account, in whole USDC. */
export async function getHotWalletUsdcBalance(seed: Uint8Array, cluster: SolanaCluster): Promise<number> {
  const owner = sol.getAddress(seed);
  const mint = USDC_MINTS[cluster];
  const ata = sol.tokenAddress({ mint, owner, tokenProgram: sol.TOKEN_PROGRAM });

  const info = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [
    ata,
    { encoding: "base64", commitment: "confirmed" },
  ]);
  if (!info.value) return 0; // No token account yet == zero balance, not an error.

  const [b64] = info.value.data;
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const decoded = sol.TokenAccount(raw);
  if (decoded.TAG !== "token") return 0;
  return Number(decoded.data.amount) / 10 ** USDC_DECIMALS;
}

export interface SolanaUsdcSendResult {
  signature: string;
  cluster: SolanaCluster;
}

async function waitForFinalized(signature: string): Promise<void> {
  // ~150 slots of blockhash validity at ~400-600ms/slot is roughly this
  // window; a flat timeout here (rather than tracking lastValidBlockHeight
  // precisely) keeps this simple -- a timeout is already a clear "did not
  // finalize" signal to the caller, which reverts covered rows to pending
  // for retry, same as any other send failure.
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const { value } = await rpc<{
      value: Array<{ err: unknown; confirmationStatus?: string } | null>;
    }>("getSignatureStatuses", [[signature], { searchTransactionHistory: true }]);
    const status = value[0];
    if (status?.err) {
      throw new Error(`transaction failed on-chain: ${JSON.stringify(status.err)}`);
    }
    // Per spec-payments.md: FINALIZED commitment only, never "confirmed" --
    // seconds faster but leaves the reorg window open, not an acceptable
    // tradeoff for an irreversible payout.
    if (status?.confirmationStatus === "finalized") return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`timed out waiting for signature ${signature} to reach finalized commitment`);
}

/**
 * Sends a USDC (SPL token) transfer from the hot wallet to `destinationAddress`.
 * Creates the recipient's associated token account if it doesn't exist yet
 * (idempotent -- succeeds as a no-op if it already does, so no separate
 * existence check/round-trip is needed first; rent paid by the hot wallet,
 * standard for a first-time SPL transfer). Waits for FINALIZED commitment
 * before returning.
 */
export async function sendUsdcPayout(
  seed: Uint8Array,
  destinationAddress: string,
  amountUsd: number,
): Promise<SolanaUsdcSendResult> {
  const addrErr = validateSolanaAddress(destinationAddress);
  if (addrErr) throw new Error(`invalid destination address: ${addrErr}`);

  const cluster = getSolanaCluster();
  const mint = USDC_MINTS[cluster];
  const owner = sol.getAddress(seed);
  const sourceAta = sol.tokenAddress({ mint, owner, tokenProgram: sol.TOKEN_PROGRAM });
  const destAta = sol.tokenAddress({ mint, owner: destinationAddress, tokenProgram: sol.TOKEN_PROGRAM });

  // Dollars -> raw u64 units. USDC_DECIMALS = 6, so $2.00 -> 2_000_000n.
  // See the USDC_DECIMALS comment above: nothing on-chain catches this
  // specific conversion being wrong.
  const rawAmount = BigInt(Math.round(amountUsd * 10 ** USDC_DECIMALS));

  const { value: bh } = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
    "getLatestBlockhash",
    [{ commitment: "finalized" }],
  );

  const unsignedTx = sol.createTx(
    owner,
    [
      sol.associatedToken.createAssociatedTokenIdempotent({
        payer: owner,
        ata: destAta,
        owner: destinationAddress,
        mint,
        systemProgram: sol.SYS_PROGRAM,
        tokenProgram: sol.TOKEN_PROGRAM,
      }),
      sol.token.transferChecked({
        source: sourceAta,
        mint,
        destination: destAta,
        authority: owner,
        amount: rawAmount,
        decimals: USDC_DECIMALS,
      }),
    ],
    bh.blockhash,
  );

  const [localSignature, signedTx] = sol.signTx(seed, unsignedTx);

  const signature = await rpc<string>("sendTransaction", [
    signedTx,
    { encoding: "base64", skipPreflight: false, preflightCommitment: "finalized" },
  ]);

  await waitForFinalized(signature || localSignature);

  return { signature: signature || localSignature, cluster };
}
