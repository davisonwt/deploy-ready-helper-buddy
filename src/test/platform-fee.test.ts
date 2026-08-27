import { describe, it, expect } from 'vitest';
import {
  S2G_FEE_PERCENT,
  round2,
  requirePrice,
  s2gFeeOn,
  buyerTotal,
  whisperShareFromBase,
  sowerNet,
  priceBreakdown,
  backOutFee,
} from '@/lib/pricing/platformFee';

describe('platformFee', () => {
  it('charges $2.00 + $0.30 fee = $2.30 for a $2 product, of any type', () => {
    expect(priceBreakdown(2)).toEqual({ base: 2, s2gFee: 0.3, total: 2.3 });
  });

  it('charges $7.50 + $1.13 fee = $8.63 for a $7.50 product', () => {
    expect(priceBreakdown(7.5)).toEqual({ base: 7.5, s2gFee: 1.13, total: 8.63 });
  });

  it('applies no floor — a sub-$1 price is charged as set', () => {
    expect(priceBreakdown(0.5)).toEqual({ base: 0.5, s2gFee: 0.08, total: 0.58 });
  });

  it('handles price: 0 as fee $0.00, total $0.00', () => {
    expect(priceBreakdown(0)).toEqual({ base: 0, s2gFee: 0, total: 0 });
  });

  it('rounds a very small price whose 15% fee is sub-cent down to $0.00', () => {
    expect(s2gFeeOn(0.01)).toBe(0);
  });

  it('coerces a numeric string price rather than rejecting it', () => {
    expect(requirePrice('2.50')).toBe(2.5);
    expect(priceBreakdown('2.50')).toEqual({ base: 2.5, s2gFee: 0.38, total: 2.88 });
  });

  it('throws — never substitutes a default — for a missing or invalid price', () => {
    expect(() => requirePrice(null)).toThrow();
    expect(() => requirePrice(undefined)).toThrow();
    expect(() => requirePrice('not-a-number')).toThrow();
    expect(() => requirePrice(-5)).toThrow();
    expect(() => requirePrice(NaN)).toThrow();
  });

  it('computes the whisperer share out of the base, never on top of the total', () => {
    const base = 2;
    const whisperShare = whisperShareFromBase(base, S2G_FEE_PERCENT);
    const net = sowerNet(base, whisperShare);
    const total = buyerTotal(base);

    expect(whisperShare).toBe(0.3);
    expect(net).toBe(1.7);
    expect(total).toBe(2.3);
    // S2G's cut plus the whisperer's cut plus the sower's net always equals
    // exactly what the buyer paid.
    expect(round2(s2gFeeOn(base) + whisperShare + net)).toBe(total);
  });

  it('falls back entirely to the sower when nobody is credited', () => {
    const base = 2;
    const net = sowerNet(base); // no whisperer share taken out
    expect(net).toBe(base);
    expect(round2(s2gFeeOn(base) + net)).toBe(buyerTotal(base));
  });

  it('a $10 gift with no whisperer nets the recipient the full base', () => {
    const base = 10;
    expect(sowerNet(base)).toBe(10);
    expect(s2gFeeOn(base)).toBe(1.5);
    expect(buyerTotal(base)).toBe(11.5);
  });

  it('a $10 seed with a 20% whisperer splits sower/whisperer/S2G correctly', () => {
    const base = 10;
    const whisperShare = whisperShareFromBase(base, 20);
    expect(whisperShare).toBe(2);
    expect(sowerNet(base, whisperShare)).toBe(8);
    expect(s2gFeeOn(base)).toBe(1.5);
    expect(buyerTotal(base)).toBe(11.5);
  });

  it('backs S2G\'s 15% out of an already fee-inclusive total (orchard pocket_price)', () => {
    expect(backOutFee(11.5)).toEqual({ base: 10, s2gFee: 1.5, total: 11.5 });
  });

  it('backOutFee then priceBreakdown-style forward math agree on the same total', () => {
    const grossTotal = 150; // e.g. a $150 orchard pocket
    const { base, s2gFee } = backOutFee(grossTotal);
    expect(round2(base + s2gFee)).toBe(grossTotal);
    expect(base).toBeCloseTo(130.43, 2);
    expect(s2gFee).toBeCloseTo(19.57, 2);
  });
});
