import { describe, it, expect } from 'vitest';
import { round2 } from '@/lib/pricing/platformFee';

// Mirror of finalize_basket_order's fee split (migration
// 20260904180000_finalize_basket_order_base_on_top.sql) -- keep in sync.
// The sower receives the FULL base; S2G's fee is what checkout added on
// top of it; a whisperer share comes out of the base, never the total.
function splitBasketLine(unitPrice: number, qty: number, lineTotal: number, commissionPercent = 0) {
  const base = round2(unitPrice * qty);
  const s2gFee = round2(lineTotal - base);
  const growerAmount = round2(base * (commissionPercent / 100));
  const sowerAmount = round2(base - growerAmount);
  return { base, s2gFee, growerAmount, sowerAmount };
}

describe('finalize_basket_order fee split (base-on-top)', () => {
  it('$2.00 seed -> sower 2.00 / fee 0.30 (the Louw/Amber incident numbers)', () => {
    const s = splitBasketLine(2.0, 1, 2.3);
    expect(s.sowerAmount).toBe(2.0);
    expect(s.s2gFee).toBe(0.3);
    // The bug this replaces: 15% OUT of the line total gave 1.95 / 0.35.
    expect(s.sowerAmount).not.toBe(1.95);
  });

  it('$12.00 seed -> sower 12.00 / fee 1.80', () => {
    const s = splitBasketLine(12.0, 1, 13.8);
    expect(s.sowerAmount).toBe(12.0);
    expect(s.s2gFee).toBe(1.8);
  });

  it('whisperer share comes out of the base, never the buyer total', () => {
    const s = splitBasketLine(2.0, 1, 2.3, 15);
    expect(s.growerAmount).toBe(0.3); // 15% of the 2.00 base
    expect(s.sowerAmount).toBe(1.7);
    expect(s.s2gFee).toBe(0.3); // fee untouched by the whisperer split
    expect(round2(s.sowerAmount + s.growerAmount + s.s2gFee)).toBe(2.3);
  });
});
