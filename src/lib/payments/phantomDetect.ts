// Phantom detection/connection helpers with NO runtime dependency on
// @solana/web3.js or @solana/spl-token -- both pull in Node's `Buffer`
// global, which doesn't exist in a browser bundle with no polyfill.
// Split out of solanaWallet.ts (which needs those libraries for real
// transaction building/signing) so a page that only needs to detect or
// connect Phantom -- like the dashboard's My Wallet card -- never drags
// them into its bundle at all, regardless of whether their Buffer-using
// code paths are actually called. solanaWallet.ts re-exports these for
// every existing call site.
import type { Transaction } from '@solana/web3.js';

export interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  signAndSendTransaction(transaction: Transaction): Promise<{ signature: string }>;
}

/** Phantom's own injected provider -- null if the extension isn't installed. */
export function getPhantomProvider(): PhantomProvider | null {
  const w = window as unknown as { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } };
  const candidate = w.phantom?.solana ?? w.solana;
  return candidate?.isPhantom ? candidate : null;
}

/** True on a mobile browser -- used to decide whether "install Phantom" points at an app store or the extension page. */
export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export const PHANTOM_INSTALL_URL = 'https://phantom.app/download';
