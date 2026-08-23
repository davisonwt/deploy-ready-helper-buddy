/**
 * Client-side validation helpers for crypto payout destinations.
 *
 * Scope is deliberately narrow: USDC on Solana and XRP on the XRP Ledger.
 * These checks are format-only — they catch typos, they cannot prove the
 * address belongs to the user. Server-side validation lives in
 * supabase/functions/_shared/cryptoAddress.ts and must stay in sync.
 */

export type PayoutNetwork = 'solana_usdc' | 'xrp';
export type PayoutWalletType = 'personal' | 'custodial';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

export const XRP_MAX_TAG = 4294967295;

export function isBase58(value: string): boolean {
  return BASE58.test(value);
}

/** Solana addresses are base58-encoded 32-byte public keys (~32-44 chars). */
export function validateSolanaAddress(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Enter your Solana wallet address.';
  if (value.length < 32 || value.length > 44) {
    return 'A Solana address is normally 32–44 characters long.';
  }
  if (!isBase58(value)) {
    return 'This is not a valid Solana address (invalid base58 characters — 0, O, I and l are never used).';
  }
  return null;
}

/** Classic XRP Ledger addresses start with "r" and are base58 (25–35 chars). */
export function validateXrpAddress(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Enter your XRP wallet address.';
  if (!value.startsWith('r')) return 'XRP Ledger addresses always start with "r".';
  if (value.length < 25 || value.length > 35) {
    return 'An XRP address is normally 25–35 characters long.';
  }
  if (!isBase58(value)) {
    return 'This is not a valid XRP address (invalid base58 characters).';
  }
  return null;
}

/** Destination tag: unsigned 32-bit integer. Only used for custodial (exchange) XRP accounts. */
export function validateDestinationTag(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Exchange deposits require a destination tag.';
  if (!/^\d+$/.test(value)) return 'A destination tag is a whole number with no spaces or letters.';
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > XRP_MAX_TAG) {
    return `A destination tag must be between 0 and ${XRP_MAX_TAG}.`;
  }
  return null;
}

export function validatePayoutAddress(network: PayoutNetwork, address: string): string | null {
  return network === 'xrp' ? validateXrpAddress(address) : validateSolanaAddress(address);
}

/** Mask the middle of an address for display / confirmation screens. */
export function maskAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export const NETWORK_LABELS: Record<PayoutNetwork, string> = {
  solana_usdc: 'USDC (Solana)',
  xrp: 'XRP (Ripple)',
};

export const EXCHANGE_TAG_WARNING =
  'Centralized exchange deposits require the correct destination tag. Sending without it, or with the wrong tag, can result in permanently lost funds. Copy this exactly from your exchange account — do not guess.';

export const IRREVERSIBLE_WARNING =
  'Crypto payments cannot be reversed or refunded. If the address (or tag) is wrong, the funds are gone permanently. Double-check every character.';
