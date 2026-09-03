// @vitest-environment node
//
// The project's default jsdom test environment shadows Node's native
// global `Buffer` in a way that breaks @solana/web3.js/@solana/spl-token's
// own internal Buffer usage ("b must be a Uint8Array" from
// @solana/buffer-layout, "Unable to find a viable program address nonce"
// from PublicKey.findProgramAddressSync) -- confirmed by running the exact
// same calls in plain Node (no jsdom), where they succeed. This file does
// no DOM/React work, so it opts into the plain Node environment instead of
// fighting jsdom's globals.
import { describe, it, expect } from 'vitest';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { parseURL, createTransfer, CreateTransferError } from '@solana/pay';

// Validates the Solana Pay URL our server builds (createSolanaIntent /
// buildSolanaIntentPricing in supabase/functions/_shared/solanaPayIn.ts)
// against the OFFICIAL @solana/pay reference implementation, run against
// REAL mainnet RPC -- the same parseURL()/createTransfer() checks Phantom
// itself runs before it will show a "Pay" button. This is what caught (by
// running it manually) the report that Phantom iOS said "Failed to
// generate a valid transaction": parseURL and the recipient-side checks
// below all passed, which is exactly why nothing changed in the URL
// builder this round -- see the commit this test was added in.
//
// buildSolanaIntentPricing itself can't be imported directly here: its
// file is Deno-only (`import ... from "https://esm.sh/..."`, a remote
// specifier Node/Vitest can't resolve). The construction below is a
// deliberate, minimal copy of its logic -- keep the two in sync if either
// changes:
//   supabase/functions/_shared/solanaPayIn.ts (buildSolanaIntentPricing)
function buildSolanaPayUrl(params: {
  hotWalletAddress: string;
  amountUsdc: number;
  mint: string;
  reference: string;
  label: string;
  message: string;
}): string {
  const url = new URL(`solana:${params.hotWalletAddress}`);
  url.searchParams.set('amount', params.amountUsdc.toFixed(6).replace(/\.?0+$/, '') || '0');
  url.searchParams.set('spl-token', params.mint);
  url.searchParams.set('reference', params.reference);
  url.searchParams.set('label', params.label);
  url.searchParams.set('message', params.message);
  return url.toString();
}

const MAINNET_USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// The real, live Sow2Grow hot wallet (SOLANA_HOT_WALLET_ADDRESS) -- not a
// secret; it's the address embedded in every buyer-facing QR code/deep
// link by design. If it's ever rotated, update this to match.
const HOT_WALLET_ADDRESS = '6zbpF3HQbxFVMfUPMRzZZ52nwA7PSvqeq2Cqibq2BcxZ';

// A random-but-valid ed25519 public key, exactly as createSolanaIntent
// generates one per order (crypto.getRandomValues -> sol.getAddress) --
// any fresh on-curve key is representative here, this one is fixed only
// so the test is deterministic to read.
const REFERENCE = '7bhTEUYku3TXWx4LyCNnAebG2w7fn292A5Do8DZ85ee9';

// A long-lived, publicly-documented exchange hot wallet -- used only as a
// real, currently-funded (SOL + an existing USDC token account)
// SystemProgram-owned sender so createTransfer's sender-existence checks
// don't fail before ever reaching the recipient-side checks this test
// actually cares about. Public on-chain data, read-only: nothing is ever
// signed or submitted. If this address ever stops qualifying, the
// createTransfer portion below skips itself rather than failing -- that
// would be drift in a third party's wallet, not a regression in our code.
const KNOWN_FUNDED_SENDER = new PublicKey('5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9');

describe('Solana Pay URL (mainnet, live RPC)', () => {
  const url = buildSolanaPayUrl({
    hotWalletAddress: HOT_WALLET_ADDRESS,
    amountUsdc: 2.31,
    mint: MAINNET_USDC_MINT.toBase58(),
    reference: REFERENCE,
    label: 'Sow2Grow',
    message: 'Sow2Grow basket (1 item)',
  });

  it('parses with the official @solana/pay parseURL (catches encoding/precision bugs)', () => {
    const parsed = parseURL(url) as ReturnType<typeof parseURL> & {
      recipient: PublicKey;
      amount: { toString(): string };
      splToken: PublicKey;
      reference: PublicKey[];
    };
    expect(parsed.recipient.toBase58()).toBe(HOT_WALLET_ADDRESS);
    expect(parsed.amount?.toString()).toBe('2.31');
    expect(parsed.splToken?.toBase58()).toBe(MAINNET_USDC_MINT.toBase58());
    expect(parsed.reference?.map((r) => r.toBase58())).toEqual([REFERENCE]);
    expect(parsed.label).toBe('Sow2Grow');
    expect(parsed.message).toBe('Sow2Grow basket (1 item)');
  });

  it(
    "the hot wallet's real mainnet USDC associated token account exists, is initialized, and isn't frozen",
    async () => {
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const parsed = parseURL(url) as unknown as { recipient: PublicKey; splToken: PublicKey };
      const ata = await getAssociatedTokenAddress(parsed.splToken, parsed.recipient);
      const account = await getAccount(connection, ata);
      expect(account.isInitialized).toBe(true);
      expect(account.isFrozen).toBe(false);
    },
    30_000,
  );

  it(
    'the official createTransfer() builds a real transaction from this exact URL against live mainnet RPC (reproduces the Phantom-side check)',
    async () => {
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const parsed = parseURL(url) as unknown as {
        recipient: PublicKey;
        amount: unknown;
        splToken: PublicKey;
        reference: PublicKey[];
      };

      try {
        const tx = await createTransfer(connection, KNOWN_FUNDED_SENDER, {
          recipient: parsed.recipient,
          amount: parsed.amount as Parameters<typeof createTransfer>[2]['amount'],
          splToken: parsed.splToken,
          reference: parsed.reference,
        });
        expect(tx.instructions.length).toBeGreaterThan(0);
      } catch (err) {
        if (
          err instanceof CreateTransferError &&
          /sender (not found|not initialized|frozen|owner invalid)/.test(err.message)
        ) {
          // Third-party fixture wallet's own state changed (rotated, ATA
          // closed, etc.) -- not a regression in our URL builder. Every
          // other CreateTransferError (bad recipient/mint/amount/
          // reference/precision) still fails this test, which is what we
          // actually care about.
          console.warn(
            `createTransfer sender check skipped -- fixture sender ${KNOWN_FUNDED_SENDER.toBase58()} ` +
              `no longer qualifies (${err.message}). Recipient/mint/amount/reference were still validated above.`,
          );
          return;
        }
        throw err;
      }
    },
    30_000,
  );
});
