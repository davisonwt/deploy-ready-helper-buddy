import { describe, it, expect } from 'vitest';
import * as client from '@/lib/pricing/platformFee';
// The server's copy is plain TS with no Deno APIs or remote imports, so it
// can be imported here directly -- that's the whole point of this test:
// the price editor's "Bestowers pay $X" helper, the seed page's Bestow
// button, and every create-*-order function must all compute the same
// buyer total from the same stored base price. If either copy of the rule
// changes without the other, this fails.
import * as server from '../../supabase/functions/_shared/platformFee';

const PRICE_TABLE = [0.99, 1.0, 2.0, 2.3, 9.99, 10.0, 12.0, 19.99, 100.0];

describe('client and server platform-fee rules never drift', () => {
  it.each(PRICE_TABLE)('price $%s -> identical base/fee/total on both sides', (price) => {
    const c = client.priceBreakdown(price);
    const s = server.priceBreakdown(price);
    expect(c.base).toBe(s.base);
    expect(c.s2gFee).toBe(s.s2gFee);
    expect(c.total).toBe(s.total);
    expect(client.buyerTotal(price)).toBe(server.buyerTotal(price));
    expect(client.s2gFeeOn(price)).toBe(server.s2gFeeOn(price));
  });

  it('the incident numbers: a $2.00 base charges $2.30 + network fee, a $2.30 base charges $2.65 + network fee', () => {
    expect(client.priceBreakdown(2.0).total).toBe(2.3);
    expect(server.priceBreakdown(2.0).total).toBe(2.3);
    expect(client.priceBreakdown(2.3).total).toBe(2.65);
    expect(server.priceBreakdown(2.3).total).toBe(2.65);
  });

  it('rates match exactly', () => {
    expect(client.S2G_FEE_RATE).toBe(server.S2G_FEE_RATE);
    expect(client.S2G_FEE_PERCENT).toBe(server.S2G_FEE_PERCENT);
  });
});

describe('client computeBuyerFeeExact matches server computeBuyerFee', () => {
  it('for every provider across the price table (fee-inclusive bases)', async () => {
    // The server module reads Deno.env for its overridable rates -- stub
    // the global so the production defaults apply, same as live (no
    // override secrets are set).
    (globalThis as Record<string, unknown>).Deno = { env: { get: () => undefined } };
    const serverFees = await import('../../supabase/functions/_shared/paypal/fees');
    const { computeBuyerFeeExact } = await import('@/lib/payments/providerFees');

    for (const base of PRICE_TABLE.map((p) => client.priceBreakdown(p).total)) {
      for (const provider of ['solana', 'paypal', 'balance'] as const) {
        const c = computeBuyerFeeExact(provider, base);
        const srv = serverFees.computeBuyerFee(provider, base);
        expect(c.fee, `${provider} fee on ${base}`).toBe(srv.fee);
        expect(c.total, `${provider} total on ${base}`).toBe(srv.total);
      }
    }

    // The incident's exact PayPal number: fee on the fee-inclusive $2.30
    // is ceil2(2.30 * 3.49% + 0.49) = $0.58 -- not the $0.56-on-base the
    // modal used to show, and not round2's $0.57 either.
    expect(computeBuyerFeeExact('paypal', 2.3).fee).toBe(0.58);
    expect(computeBuyerFeeExact('solana', 2.3).total).toBe(2.31);
  });
});
