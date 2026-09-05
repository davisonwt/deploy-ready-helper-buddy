// Orchard pocket rules -- pure, no Deno/Supabase imports, so the unit suite
// can import this file directly (same pattern as _shared/platformFee.ts).
// A client copy lives at src/lib/orchards/pocketRules.ts; the drift test
// pins the two together.
//
// P0-5 Phase A (2026-09-05): money paid into an orchard is HELD, never an
// earning, until the orchard is fully funded. Target = total_pockets x
// pocket_price (owner's rule). Nothing here moves money.

export type PocketType = 'bestowal' | 'gift';

export interface DeliveryAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postal_code: string;
  country: string;
  phone?: string | null;
}

export interface FundingInputs {
  totalPockets: number | null | undefined;
  pocketPrice: number | null | undefined;
  /** Sum of gross_amount over holdings in status held|released. */
  heldTotal: number;
  /** Sum of pockets over the same holdings. */
  pocketsHeld: number;
}

export interface FundingStatus {
  target: number;
  heldTotal: number;
  pocketsTotal: number;
  pocketsHeld: number;
  pocketsRemaining: number;
  percent: number;
  funded: boolean;
}

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Mirrors public.orchard_funding_status() exactly. */
export function computeFundingStatus(i: FundingInputs): FundingStatus {
  const pocketsTotal = Math.max(0, Math.floor(Number(i.totalPockets ?? 0)));
  const price = Math.max(0, Number(i.pocketPrice ?? 0));
  const target = round2(pocketsTotal * price);
  const heldTotal = round2(Math.max(0, Number(i.heldTotal ?? 0)));
  const pocketsHeld = Math.max(0, Math.floor(Number(i.pocketsHeld ?? 0)));
  const funded = pocketsTotal > 0 && heldTotal >= target;
  const percent = target > 0 ? Math.min(100, Math.round((heldTotal / target) * 100)) : 0;
  return {
    target,
    heldTotal,
    pocketsTotal,
    pocketsHeld,
    pocketsRemaining: Math.max(0, pocketsTotal - pocketsHeld),
    percent,
    funded,
  };
}

/**
 * The split recorded on a holding for a paid pocket bestowal. pocket_price
 * is fee-inclusive by design (spec-payments.md "price contract"), so the
 * sower's share is gross / 1.15 unless the payment snapshot already carries
 * a sower_amount, and S2G's share is the remainder -- held with the rest.
 */
export function holdingSplit(gross: number, snapshotSowerAmount?: number | null) {
  const g = round2(Math.max(0, gross));
  const sower = round2(snapshotSowerAmount != null ? Number(snapshotSowerAmount) : g / 1.15);
  const s2g = round2(Math.max(0, g - sower));
  return { gross: g, sower, s2g };
}

/**
 * Backfill reversal (Migration A1 step 7): a stray earning credit of
 * `credited` is reversed by an equal debit; the sower's balance after
 * reversal is what it was before the credit.
 */
export function reversalDebit(credited: number): number {
  return round2(Math.max(0, credited));
}

/**
 * Which pocket kinds need a delivery address. A 'bestowal' pocket claims a
 * physical unit that has to be shipped; a 'gift' pocket funds a unit that
 * goes to the sower as stock and needs no address. Digital orchards never
 * need one. (Launch/Uplift kinds arrive in Phase B; until then "physical"
 * is the signal.)
 */
export function deliveryAddressRequired(pocketType: PocketType, productType: string | null | undefined): boolean {
  return pocketType === 'bestowal' && (productType ?? 'physical') === 'physical';
}

const REQUIRED_ADDRESS_FIELDS: (keyof DeliveryAddress)[] = ['name', 'line1', 'city', 'postal_code', 'country'];

/** Returns null when valid, otherwise a plain-English problem. */
export function validateDeliveryAddress(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Delivery address is missing.';
  const a = input as Record<string, unknown>;
  for (const f of REQUIRED_ADDRESS_FIELDS) {
    const v = a[f];
    if (typeof v !== 'string' || v.trim().length === 0) return `Delivery address needs a ${f.replace('_', ' ')}.`;
    if (v.trim().length > 200) return `Delivery address ${f.replace('_', ' ')} is too long.`;
  }
  for (const f of ['line2', 'region', 'phone'] as const) {
    const v = a[f];
    if (v != null && typeof v !== 'string') return `Delivery address ${f} must be text.`;
    if (typeof v === 'string' && v.length > 200) return `Delivery address ${f} is too long.`;
  }
  return null;
}

/** Trim and drop unknown keys so only the declared shape is stored. */
export function normalizeDeliveryAddress(input: DeliveryAddress): DeliveryAddress {
  const t = (v: unknown) => (typeof v === 'string' ? v.trim() : null);
  return {
    name: t(input.name) ?? '',
    line1: t(input.line1) ?? '',
    line2: t(input.line2),
    city: t(input.city) ?? '',
    region: t(input.region),
    postal_code: t(input.postal_code) ?? '',
    country: t(input.country) ?? '',
    phone: t(input.phone),
  };
}

/**
 * Validate the pocket part of a create-orchard-bestowal-order payload.
 * Returns null when acceptable, otherwise the error to send back.
 */
export function validatePocketRequest(args: {
  pocketType: unknown;
  deliveryAddress: unknown;
  productType: string | null | undefined;
}): string | null {
  const kind = args.pocketType ?? 'bestowal';
  if (kind !== 'bestowal' && kind !== 'gift') return 'invalid_pocket_type';
  const needsAddress = deliveryAddressRequired(kind, args.productType);
  if (needsAddress) {
    const problem = validateDeliveryAddress(args.deliveryAddress);
    if (problem) return `delivery_address_required: ${problem}`;
  } else if (args.deliveryAddress != null) {
    return 'delivery_address_not_accepted';
  }
  return null;
}
