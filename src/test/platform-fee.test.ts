import { describe, it, expect } from 'vitest';
import {
  S2G_FEE_PERCENT,
  round2,
  requirePrice,
  s2gFeeOn,
  buyerTotal,
  whisperShareFromBase,
  priceBreakdown,
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
    const sowerNet = round2(base - whisperShare);
    const total = buyerTotal(base);

    expect(whisperShare).toBe(0.3);
    expect(sowerNet).toBe(1.7);
    expect(total).toBe(2.3);
    // S2G's cut plus the whisperer's cut plus the sower's net always equals
    // exactly what the buyer paid.
    expect(round2(s2gFeeOn(base) + whisperShare + sowerNet)).toBe(total);
  });

  it('falls back entirely to the sower when nobody is credited', () => {
    const base = 2;
    const sowerNet = base; // no whisperer share taken out
    expect(round2(s2gFeeOn(base) + sowerNet)).toBe(buyerTotal(base));
  });
});
