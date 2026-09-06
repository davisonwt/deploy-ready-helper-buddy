// P0-5 Phase A: orchard funding math, backfill reversal math, pocket rules.
// Also a drift test: the client copy (src/lib/orchards/pocketRules.ts) and
// the server copy (supabase/functions/_shared/orchardHolding.ts) must agree.

import { describe, it, expect } from 'vitest';
import * as client from '@/lib/orchards/pocketRules';
import * as server from '../../supabase/functions/_shared/orchardHolding';

const cases = [
  { totalPockets: 100, pocketPrice: 29.41, heldTotal: 0, pocketsHeld: 0 },
  { totalPockets: 100, pocketPrice: 29.41, heldTotal: 2941, pocketsHeld: 100 },
  { totalPockets: 100, pocketPrice: 29.41, heldTotal: 2940.99, pocketsHeld: 99 },
  { totalPockets: 10, pocketPrice: 150, heldTotal: 450, pocketsHeld: 3 },
  { totalPockets: 0, pocketPrice: 150, heldTotal: 0, pocketsHeld: 0 },
  { totalPockets: null, pocketPrice: null, heldTotal: 0, pocketsHeld: 0 },
  { totalPockets: 3, pocketPrice: 2.3, heldTotal: 9.2, pocketsHeld: 4 }, // over-funded stays funded, remaining 0
];

describe('orchard funding status (mirrors public.orchard_funding_status)', () => {
  it('target = total_pockets x pocket_price, funded only at or above target', () => {
    const s = client.computeFundingStatus(cases[0]);
    expect(s.target).toBe(2941);
    expect(s.funded).toBe(false);
    expect(s.percent).toBe(0);
    expect(client.computeFundingStatus(cases[1]).funded).toBe(true);
    expect(client.computeFundingStatus(cases[1]).percent).toBe(100);
    expect(client.computeFundingStatus(cases[2]).funded).toBe(false);
    expect(client.computeFundingStatus(cases[2]).percent).toBe(100); // rounds, but funded stays false
    const partial = client.computeFundingStatus(cases[3]);
    expect(partial).toMatchObject({ target: 1500, heldTotal: 450, pocketsTotal: 10, pocketsHeld: 3, pocketsRemaining: 7, percent: 30, funded: false });
  });

  it('an orchard with no pockets can never be funded', () => {
    expect(client.computeFundingStatus(cases[4]).funded).toBe(false);
    expect(client.computeFundingStatus(cases[5])).toMatchObject({ target: 0, funded: false, percent: 0 });
  });

  it('over-funding keeps funded=true and remaining at 0', () => {
    expect(client.computeFundingStatus(cases[6])).toMatchObject({ funded: true, pocketsRemaining: 0, percent: 100 });
  });

  it('client and server copies agree on every case', () => {
    for (const c of cases) expect(client.computeFundingStatus(c)).toEqual(server.computeFundingStatus(c));
  });
});

describe('holding split and backfill reversal', () => {
  it('splits a fee-inclusive pocket price into sower + S2G (mirrors orchard_apply_holding)', () => {
    // $29.41 pocket: sower 25.57, S2G 3.84 -- both HELD, nothing released
    expect(client.holdingSplit(29.41)).toEqual({ gross: 29.41, sower: 25.57, s2g: 3.84 });
    // snapshot wins when present
    expect(client.holdingSplit(29.41, 25.0)).toEqual({ gross: 29.41, sower: 25.0, s2g: 4.41 });
    expect(server.holdingSplit(29.41)).toEqual(client.holdingSplit(29.41));
  });

  it('reversal debit equals the stray credit, so the sower balance returns to pre-credit', () => {
    const before = 10.0;
    const strayCredit = 25.57;
    const afterCredit = client.round2(before + strayCredit);
    const afterReversal = client.round2(afterCredit - client.reversalDebit(strayCredit));
    expect(afterReversal).toBe(before);
    expect(client.reversalDebit(-5)).toBe(0);
    expect(server.reversalDebit(25.57)).toBe(client.reversalDebit(25.57));
  });
});

describe('pocket rules (mirrors create-orchard-bestowal-order validation)', () => {
  const address = { name: 'A Member', line1: '1 Orchard Lane', city: 'Cape Town', postal_code: '8001', country: 'ZA' };

  it('a bestowal pocket on a physical orchard requires a delivery address', () => {
    expect(client.validatePocketRequest({ pocketType: 'bestowal', deliveryAddress: undefined, productType: 'physical' }))
      .toMatch(/^delivery_address_required/);
    expect(client.validatePocketRequest({ pocketType: 'bestowal', deliveryAddress: { ...address, city: '' }, productType: 'physical' }))
      .toMatch(/needs a city/);
    expect(client.validatePocketRequest({ pocketType: 'bestowal', deliveryAddress: address, productType: 'physical' })).toBeNull();
  });

  it('a gift pocket and a digital orchard must not carry an address', () => {
    expect(client.validatePocketRequest({ pocketType: 'gift', deliveryAddress: undefined, productType: 'physical' })).toBeNull();
    expect(client.validatePocketRequest({ pocketType: 'gift', deliveryAddress: address, productType: 'physical' })).toBe('delivery_address_not_accepted');
    expect(client.validatePocketRequest({ pocketType: 'bestowal', deliveryAddress: undefined, productType: 'digital' })).toBeNull();
  });

  it('defaults to a bestowal pocket and rejects unknown kinds', () => {
    expect(client.validatePocketRequest({ pocketType: undefined, deliveryAddress: address, productType: 'physical' })).toBeNull();
    expect(client.validatePocketRequest({ pocketType: 'loan', deliveryAddress: undefined, productType: 'physical' })).toBe('invalid_pocket_type');
  });

  it('normalises an address to the declared shape only', () => {
    const n = client.normalizeDeliveryAddress({ ...address, line1: '  1 Orchard Lane ', extra: 'dropped' } as any);
    expect(n).toEqual({ name: 'A Member', line1: '1 Orchard Lane', line2: null, city: 'Cape Town', region: null, postal_code: '8001', country: 'ZA', phone: null });
    expect(server.normalizeDeliveryAddress(address)).toEqual(client.normalizeDeliveryAddress(address));
  });

  it('client and server rules agree', () => {
    for (const args of [
      { pocketType: 'bestowal', deliveryAddress: undefined, productType: 'physical' },
      { pocketType: 'gift', deliveryAddress: address, productType: 'physical' },
      { pocketType: 'bestowal', deliveryAddress: address, productType: 'digital' },
      { pocketType: 'nope', deliveryAddress: undefined, productType: null },
    ]) expect(client.validatePocketRequest(args)).toEqual(server.validatePocketRequest(args));
  });
});

describe('orchard release (mirrors public.orchard_release_locked, Phase B)', () => {
  const h = (over: Partial<client.ReleasableHolding> = {}): client.ReleasableHolding => ({
    status: 'held', pockets: 1, pocketType: 'bestowal', grossAmount: 10, sowerAmount: 8.7, s2gAmount: 1.3, environment: 'live', ...over,
  });

  it('sower total and S2G total are the sums of the HELD holdings; a gift pocket is one stock unit', () => {
    const t = client.releaseTotals([h(), h(), h({ pocketType: 'gift' })]);
    expect(t).toEqual({ holdings: 3, pockets: 3, giftUnits: 1, gross: 30, sowerTotal: 26.1, s2gTotal: 3.9, s2gByEnvironment: { live: 3.9 } });
  });

  it('S2G share is split per environment: a live/devnet mix records two fee rows', () => {
    const t = client.releaseTotals([h(), h({ environment: 'devnet' }), h({ environment: 'devnet', pockets: 2, grossAmount: 20, sowerAmount: 17.39, s2gAmount: 2.61 })]);
    expect(t.s2gByEnvironment).toEqual({ live: 1.3, devnet: 3.91 });
    expect(t.pockets).toBe(4);
    expect(t.sowerTotal).toBe(34.79);
  });

  it('released holdings do not count, so a second release has nothing to release', () => {
    const t = client.releaseTotals([h({ status: 'released' }), h({ status: 'released' })]);
    expect(t).toMatchObject({ holdings: 0, pockets: 0, sowerTotal: 0, s2gTotal: 0, s2gByEnvironment: {} });
    expect(client.releaseRefusal({ orchardKind: 'launch', fundingState: 'released', funded: true, heldHoldings: 0 })).toBe('already_released');
  });

  it('refusals: not funded, not launch, cancelled, nothing held; a funded launch orchard with held pockets releases', () => {
    expect(client.releaseRefusal({ orchardKind: 'launch', fundingState: 'open', funded: false, heldHoldings: 2 })).toBe('not_funded');
    expect(client.releaseRefusal({ orchardKind: 'uplift', fundingState: 'funded', funded: true, heldHoldings: 2 })).toBe('not_launch');
    expect(client.releaseRefusal({ orchardKind: 'launch', fundingState: 'cancelled', funded: true, heldHoldings: 2 })).toBe('cancelled');
    expect(client.releaseRefusal({ orchardKind: 'launch', fundingState: 'funded', funded: true, heldHoldings: 0 })).toBe('no_held_holdings');
    expect(client.releaseRefusal({ orchardKind: 'launch', fundingState: 'funded', funded: true, heldHoldings: 3 })).toBeNull();
  });

  it('client and server copies agree', () => {
    const rows = [h(), h({ pocketType: 'gift', environment: 'devnet' })];
    expect(client.releaseTotals(rows)).toEqual(server.releaseTotals(rows));
    expect(client.releaseRefusal({ orchardKind: 'launch', fundingState: 'open', funded: false, heldHoldings: 1 }))
      .toBe(server.releaseRefusal({ orchardKind: 'launch', fundingState: 'open', funded: false, heldHoldings: 1 }));
  });
});
