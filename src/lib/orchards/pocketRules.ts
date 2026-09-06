// Client copy of supabase/functions/_shared/orchardHolding.ts -- kept
// byte-for-byte equal in behaviour by src/test/orchard-holding.test.ts
// (the drift test). Edit both or neither.

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
  heldTotal: number;
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

export function holdingSplit(gross: number, snapshotSowerAmount?: number | null) {
  const g = round2(Math.max(0, gross));
  const sower = round2(snapshotSowerAmount != null ? Number(snapshotSowerAmount) : g / 1.15);
  const s2g = round2(Math.max(0, g - sower));
  return { gross: g, sower, s2g };
}

export function reversalDebit(credited: number): number {
  return round2(Math.max(0, credited));
}

export function deliveryAddressRequired(pocketType: PocketType, productType: string | null | undefined): boolean {
  return pocketType === 'bestowal' && (productType ?? 'physical') === 'physical';
}

const REQUIRED_ADDRESS_FIELDS: (keyof DeliveryAddress)[] = ['name', 'line1', 'city', 'postal_code', 'country'];

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

/** One holding as the release math sees it. */
export interface ReleasableHolding {
  status: string;
  pockets: number;
  pocketType: PocketType | null | undefined;
  sowerAmount: number;
  s2gAmount: number;
  grossAmount: number;
  environment?: 'live' | 'devnet' | 'sandbox';
}

export interface ReleaseTotals {
  holdings: number;
  pockets: number;
  giftUnits: number;
  gross: number;
  sowerTotal: number;
  s2gTotal: number;
  /** S2G's share per environment: one revenue row each. */
  s2gByEnvironment: Record<string, number>;
}

/**
 * Mirrors public.orchard_release_locked(): only HELD holdings count, the
 * sower is owed the sum of their snapshot shares, S2G's fee is the sum of
 * the held s2g shares split by the environment the money moved on, and a
 * gift pocket becomes one stock unit per pocket. Released holdings are
 * ignored, which is what makes a second release a no-op.
 */
export function releaseTotals(holdings: ReleasableHolding[]): ReleaseTotals {
  const held = holdings.filter((h) => h.status === 'held');
  const byEnv: Record<string, number> = {};
  let pockets = 0, gift = 0, gross = 0, sower = 0, s2g = 0;
  for (const h of held) {
    pockets += h.pockets;
    if (h.pocketType === 'gift') gift += h.pockets;
    gross += h.grossAmount;
    sower += h.sowerAmount;
    s2g += h.s2gAmount;
    const env = h.environment ?? 'live';
    byEnv[env] = round2((byEnv[env] ?? 0) + h.s2gAmount);
  }
  return {
    holdings: held.length,
    pockets,
    giftUnits: gift,
    gross: round2(gross),
    sowerTotal: round2(sower),
    s2gTotal: round2(s2g),
    s2gByEnvironment: byEnv,
  };
}

/** Mirrors the preconditions: launch, funded, not already released, something held. */
export function releaseRefusal(args: {
  orchardKind: string;
  fundingState: string;
  funded: boolean;
  heldHoldings: number;
}): null | 'not_launch' | 'already_released' | 'cancelled' | 'not_funded' | 'no_held_holdings' {
  if (args.orchardKind !== 'launch') return 'not_launch';
  if (args.fundingState === 'released') return 'already_released';
  if (args.fundingState === 'cancelled') return 'cancelled';
  if (!args.funded) return 'not_funded';
  if (args.heldHoldings === 0) return 'no_held_holdings';
  return null;
}
