// Hot-wallet Solana USDC sending, used by payout-earnings' Solana rail.
// spec-payments.md section 2: this is the single-key HOT WALLET, never the
// 2-of-3 Squad -- a multisig can't sign an automated instant payout.
//
// SECRETS (Project Settings -> Secrets):
//
//   SOLANA_HOT_WALLET_SECRET_KEY   REQUIRED. Base58-encoded 64-byte Solana
//                                  secret key -- exactly what Phantom's
//                                  "Export Private Key" gives you. A JSON
//                                  array of 64 numbers is also accepted (some
//                                  tools export that shape instead), but
//                                  base58 is the expected/primary format.
//                                  Never generated, invented, or hardcoded
//                                  here -- the operator creates the wallet
//                                  and pastes this in.
//
//   SOLANA_HOT_WALLET_ADDRESS      REQUIRED. The wallet's public address
//                                  (base58), stored separately so the code
//                                  can log and sanity-check which wallet
//                                  it's about to send from on every run
//                                  without re-deriving it from the secret
//                                  key each call. If this doesn't match the
//                                  address the secret key actually derives
//                                  to, that's treated as a configuration
//                                  error and the whole Solana leg of the run
//                                  is refused -- see verifyHotWallet() below.
//
// Cluster defaults to devnet (see _shared/cryptoNetworks.ts) -- nothing
// here points at mainnet unless SOLANA_CLUSTER=mainnet-beta is set.

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "https://esm.sh/@solana/web3.js@1.95.3";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from "https://esm.sh/@solana/spl-token@0.4.8";
import bs58 from "https://esm.sh/bs58@5.0.0";
import { validateSolanaAddress } from "./cryptoAddress.ts";
import { USDC_MINTS, getSolanaCluster, type SolanaCluster } from "./cryptoNetworks.ts";

export function loadHotWalletKeypair(): Keypair {
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
  return Keypair.fromSecretKey(bytes);
}

/**
 * Confirms the configured SOLANA_HOT_WALLET_ADDRESS actually matches the
 * public key the secret key derives to. A mismatch means the two secrets
 * were set inconsistently (e.g. the key was rotated and the address
 * wasn't, or vice versa) -- refuse to send rather than silently sending
 * from a wallet nobody logged or verified.
 */
export function verifyHotWallet(sender: Keypair): { address: string } {
  const configured = (Deno.env.get("SOLANA_HOT_WALLET_ADDRESS") ?? "").trim();
  if (!configured) {
    throw new Error(
      "SOLANA_HOT_WALLET_ADDRESS secret is not configured -- add the hot wallet's public address " +
        "in Project Settings -> Secrets so sends can be verified without re-deriving it every call.",
    );
  }
  const derived = sender.publicKey.toBase58();
  if (derived !== configured) {
    throw new Error(
      `SOLANA_HOT_WALLET_ADDRESS (${configured}) does not match the address SOLANA_HOT_WALLET_SECRET_KEY ` +
        `actually derives to (${derived}). Refusing to send -- this is a configuration error, not a network error.`,
    );
  }
  return { address: derived };
}

/** Current USDC balance held in the hot wallet's associated token account, in whole USDC. */
export async function getHotWalletUsdcBalance(
  connection: Connection,
  sender: Keypair,
  cluster: SolanaCluster,
): Promise<number> {
  const mint = new PublicKey(USDC_MINTS[cluster]);
  const ata = await getAssociatedTokenAddress(mint, sender.publicKey);
  try {
    const account = await getAccount(connection, ata);
    const mintInfo = await getMint(connection, mint);
    return Number(account.amount) / 10 ** mintInfo.decimals;
  } catch {
    // No token account yet == zero balance, not an error.
    return 0;
  }
}

export interface SolanaUsdcSendResult {
  signature: string;
  cluster: SolanaCluster;
}

/**
 * Sends a USDC (SPL token) transfer from the hot wallet to `destinationAddress`.
 * Creates the recipient's associated token account if it doesn't exist yet
 * (rent paid by the hot wallet, standard for a first-time SPL transfer).
 * Waits for FINALIZED commitment before returning -- per spec-payments.md,
 * "processed"/"confirmed" is seconds faster but leaves the reorg window
 * open, which is not an acceptable tradeoff for an irreversible payout.
 */
export async function sendUsdcPayout(
  connection: Connection,
  sender: Keypair,
  destinationAddress: string,
  amountUsd: number,
): Promise<SolanaUsdcSendResult> {
  const addrErr = validateSolanaAddress(destinationAddress);
  if (addrErr) throw new Error(`invalid destination address: ${addrErr}`);

  const cluster = getSolanaCluster();
  const mint = new PublicKey(USDC_MINTS[cluster]);
  const destPubkey = new PublicKey(destinationAddress);

  const mintInfo = await getMint(connection, mint);
  const rawAmount = BigInt(Math.round(amountUsd * 10 ** mintInfo.decimals));

  const fromAta = await getAssociatedTokenAddress(mint, sender.publicKey);
  const toAta = await getOrCreateAssociatedTokenAccount(connection, sender, mint, destPubkey);

  const tx = new Transaction().add(
    createTransferCheckedInstruction(
      fromAta,
      mint,
      toAta.address,
      sender.publicKey,
      rawAmount,
      mintInfo.decimals,
    ),
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;
  tx.feePayer = sender.publicKey;
  tx.sign(sender);

  const signature = await connection.sendRawTransaction(tx.serialize());
  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "finalized",
  );
  if (confirmation.value.err) {
    throw new Error(`transaction finalized with an error: ${JSON.stringify(confirmation.value.err)}`);
  }

  return { signature, cluster };
}
