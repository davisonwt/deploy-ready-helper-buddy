// Browser wallet integration for direct Solana USDC pay-in. Phantom's
// injected `window.solana` provider (also the de facto reference
// implementation most Wallet Standard wallets ship) -- @solana/web3.js is
// used here deliberately, unlike the edge functions (_shared/solanaPayIn.ts
// / solanaPayout.ts), which avoid it for Deno's 2s CPU ceiling. That
// constraint is server-only; the browser has no such budget, and Phantom's
// signAndSendTransaction API is built around web3.js's Transaction class in
// every documented integration path, so fighting that with micro-sol-signer
// here would fight the wallet's own API rather than a real constraint.

import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { USDC_MINTS, getSolanaRpcUrl, type SolanaCluster } from './solanaNetworks';
// Re-exported for every existing call site -- the actual definitions live
// in phantomDetect.ts, which has no @solana/web3.js or @solana/spl-token
// runtime import, so a page that only needs Phantom detection/connect
// (the dashboard's My Wallet card) can import from there directly and
// never pull those Buffer-dependent libraries into its bundle at all.
export { getPhantomProvider, isMobileDevice, PHANTOM_INSTALL_URL, type PhantomProvider } from './phantomDetect';

const USDC_DECIMALS = 6;

// getUsdcBalance (a direct browser call to connection.getTokenAccountBalance)
// used to live here -- removed 2026-09-04: api.mainnet-beta.solana.com
// CORS-blocks browser fetches, so it silently returned 0 for everyone and
// the pay screen reported a real-looking "You have 0.00 USDC". The balance
// pre-check now goes through the get-wallet-balance edge function (see
// useSolanaWalletPay), the same server-config read the dashboard tile uses.

/**
 * Builds the buyer's own USDC transferChecked transaction, unsigned, ready
 * for Phantom's signAndSendTransaction. Appends the Solana Pay reference
 * pubkey to the transfer instruction as a read-only, non-signer account --
 * the standard pattern (same one the solana: URI / QR path already relies
 * on) that lets check-solana-payment find this exact transaction via
 * getSignaturesForAddress(reference) unchanged, regardless of which path
 * (wallet button or QR-scanning another wallet) the buyer actually used.
 * Also idempotently creates the hot wallet's destination USDC account if
 * it doesn't exist yet, paid by the buyer -- standard for a first transfer
 * into a token account, same as sendUsdcPayout's outbound equivalent.
 */
export async function buildUsdcTransferTransaction(params: {
  connection: Connection;
  payer: PublicKey;
  hotWalletAddress: string;
  referencePubkey: string;
  amountUsdc: number;
  cluster: SolanaCluster;
}): Promise<Transaction> {
  const { connection, payer, cluster } = params;
  const mint = new PublicKey(USDC_MINTS[cluster]);
  const recipient = new PublicKey(params.hotWalletAddress);
  const reference = new PublicKey(params.referencePubkey);

  const sourceAta = await getAssociatedTokenAddress(mint, payer);
  const destAta = await getAssociatedTokenAddress(mint, recipient);

  const rawAmount = BigInt(Math.round(params.amountUsdc * 10 ** USDC_DECIMALS));

  const transferIx = createTransferCheckedInstruction(
    sourceAta,
    mint,
    destAta,
    payer,
    rawAmount,
    USDC_DECIMALS,
  );
  transferIx.keys.push({ pubkey: reference, isSigner: false, isWritable: false });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

  const tx = new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight });
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(payer, destAta, recipient, mint),
    transferIx,
  );
  return tx;
}

export function usdcConnection(cluster: SolanaCluster): Connection {
  return new Connection(getSolanaRpcUrl(cluster), 'confirmed');
}
