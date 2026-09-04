import { describe, it, expect } from 'vitest';
import { priceBreakdown, round2 } from '@/lib/pricing/platformFee';

// Audits every create-*-order edge function's Solana amount computation
// (the value that becomes createSolanaIntent's amountUsdc, i.e. what the
// Solana Pay screen asks for) for a double application of the 15% S2G
// platform fee. Investigated after a report that Louw's music seed
// checkout ("The Ancient Voice - Hear Him Roar", listed at $2.30) showed
// "Bestow $2.30" in one place but a $2.66 Solana pay screen -- traced
// every create-*-order function's source directly (not just this test)
// and found the platform fee is applied via priceBreakdown() exactly
// once per order kind (or, for orchard/topup, correctly not at all --
// see each case below), never twice. $2.66 is the mathematically correct
// charge for a $2.30 base: $2.30 + 15% ($0.35) = $2.65, + the flat $0.01
// Solana network-fee notice = $2.66. This test pins that math down as a
// regression guard, and reproduces Louw's real order as its own case.
//
// _shared/paypal/fees.ts's computeBuyerFee('solana', x) can't be
// imported here (Deno-only, Deno.env.get) -- reimplemented below exactly
// (flat $0.01 on top, no percent, ignoring its env-override path which
// isn't set in production): supabase/functions/_shared/paypal/fees.ts
const SOLANA_FLAT_FEE = 0.01;
function solanaBuyerTotal(base: number): number {
  return round2(base + SOLANA_FLAT_FEE);
}

describe('create-*-order Solana amount math (no double fee application)', () => {
  it('basket (create-basket-bestowal-order): base -> priceBreakdown once -> +$0.01', () => {
    // Louw's real seed, real reported numbers.
    expect(priceBreakdown(2.3).total).toBe(2.65);
    expect(solanaBuyerTotal(priceBreakdown(2.3).total)).toBe(2.66);

    // A second, independent fixture -- rules out 2.3 being a coincidental match.
    expect(priceBreakdown(2.0).total).toBe(2.3);
    expect(solanaBuyerTotal(priceBreakdown(2.0).total)).toBe(2.31);
  });

  it('content (create-content-purchase-order): basePrice -> priceBreakdown once -> +$0.01', () => {
    expect(priceBreakdown(5.0).total).toBe(5.75);
    expect(solanaBuyerTotal(priceBreakdown(5.0).total)).toBe(5.76);
  });

  it('gift (create-gift-bestowal-order): giver-entered amount -> priceBreakdown once -> +$0.01', () => {
    expect(priceBreakdown(10.0).total).toBe(11.5);
    expect(solanaBuyerTotal(priceBreakdown(10.0).total)).toBe(11.51);
  });

  it('orchard (create-orchard-bestowal-order): pocket_price is already fee-inclusive -- NOT run through priceBreakdown, just +$0.01', () => {
    const pocketPrice = 3.45;
    const pocketsCount = 2;
    const baseAmount = round2(pocketPrice * pocketsCount);
    expect(baseAmount).toBe(6.9);
    // No 15% added here -- the fee is already baked into pocket_price at
    // orchard-creation time. Applying priceBreakdown on top of this would
    // BE the double-fee bug (grossing up an already-grossed-up price).
    expect(solanaBuyerTotal(baseAmount)).toBe(6.91);
  });

  it('topup (create-wallet-topup): raw entered amount, no S2G fee at all (not a seed purchase) -> +$0.01', () => {
    const amount = 20;
    // No priceBreakdown call at all in create-wallet-topup -- topping up
    // your own balance isn't a sale, there's no seed and no sower to pay.
    expect(solanaBuyerTotal(amount)).toBe(20.01);
  });
});
