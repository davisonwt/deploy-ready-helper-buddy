// Server-side mirror of src/lib/payments/cryptoAddress.ts.
// Validation for the two supported payout rails:
//   • USDC on Solana  (base58 address that decodes to a real 32-byte public
//     key — a well-formed-looking string is not enough, see below)
//   • XRP on the XRP Ledger (base58 "r..." address, optional destination tag)

import bs58 from "https://esm.sh/bs58@5.0.0";

export type PayoutNetwork = "solana_usdc" | "xrp";
export type PayoutWalletType = "personal" | "custodial";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
export const XRP_MAX_TAG = 4294967295;

export function validateSolanaAddress(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return "Solana address is required.";
  if (v.length < 32 || v.length > 44) return "Solana address must be 32-44 characters.";
  if (!BASE58.test(v)) return "Solana address is not valid base58.";
  // A Solana address is a base58-encoded ed25519 public key — exactly 32
  // raw bytes. Charset + length alone accept plausible-looking garbage that
  // isn't a real key; decoding is the only way to actually confirm it. A bad
  // address here means permanently lost funds, so this check is mandatory,
  // not cosmetic.
  let decoded: Uint8Array;
  try {
    decoded = bs58.decode(v);
  } catch {
    return "Solana address is not valid base58.";
  }
  if (decoded.length !== 32) {
    return "This does not decode to a valid 32-byte Solana public key.";
  }
  return null;
}

export function validateXrpAddress(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return "XRP address is required.";
  if (!v.startsWith("r")) return 'XRP address must start with "r".';
  if (v.length < 25 || v.length > 35) return "XRP address must be 25-35 characters.";
  if (!BASE58.test(v)) return "XRP address is not valid base58.";
  return null;
}

export function validateDestinationTag(tag: unknown): string | null {
  if (typeof tag !== "number" || !Number.isInteger(tag)) {
    return "Destination tag must be an integer.";
  }
  if (tag < 0 || tag > XRP_MAX_TAG) return `Destination tag must be 0-${XRP_MAX_TAG}.`;
  return null;
}

export interface PayoutDetails {
  payout_network: PayoutNetwork;
  payout_address: string;
  payout_tag: number | null;
  payout_wallet_type: PayoutWalletType;
}

/** Full-shape validation. Returns an error string, or null when the payload is sound. */
export function validatePayoutDetails(input: Partial<PayoutDetails>): string | null {
  const { payout_network, payout_address, payout_tag, payout_wallet_type } = input;

  if (payout_network !== "solana_usdc" && payout_network !== "xrp") {
    return "payout_network must be 'solana_usdc' or 'xrp'.";
  }
  if (payout_wallet_type !== "personal" && payout_wallet_type !== "custodial") {
    return "payout_wallet_type must be 'personal' or 'custodial'.";
  }

  const addrErr = payout_network === "xrp"
    ? validateXrpAddress(payout_address ?? "")
    : validateSolanaAddress(payout_address ?? "");
  if (addrErr) return addrErr;

  if (payout_network === "solana_usdc") {
    // Solana has no destination-tag concept at all.
    if (payout_tag !== null && payout_tag !== undefined) {
      return "Solana payouts must not carry a destination tag.";
    }
    return null;
  }

  // XRP
  if (payout_wallet_type === "custodial") {
    return validateDestinationTag(payout_tag);
  }
  if (payout_tag !== null && payout_tag !== undefined) {
    return "Personal (self-custody) XRP wallets must not carry a destination tag.";
  }
  return null;
}
