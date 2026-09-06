// P0-5 Phase C2: the money-direction guardrail the refund worker runs on a
// fresh row under lock before every send, and the "did it already go out"
// search. Pure rules from supabase/functions/_shared/orchardRefundRules.ts.

import { describe, it, expect } from 'vitest';
import {
  findRefundSendInParsedTxs,
  nextStatusAfterFailure,
  ORCHARD_REFUND_MAX_ATTEMPTS,
  paypalRefundFeeCost,
  refundSendAllowed,
  usdToRawUsdc,
  type RecentParsedTx,
  type RefundClaim,
  type RefundGuardContext,
} from '../../supabase/functions/_shared/orchardRefundRules';

const PAYER = 'EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx';
const HOT_ATA = '7h8NWW5whNQt6n3W8j28mgdgiy2g2JvLb7qJ5DbzDC4r';
const MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

function claim(over: Partial<RefundClaim> = {}): RefundClaim {
  return {
    id: 'r1', orchard_id: 'o1', holding_id: 'h1', rail: 'solana', amount: 10, destination: PAYER, status: 'sending', attempts: 0,
    rail_reference: null, environment: 'devnet', claimed_at: '2026-09-06T12:00:00Z', holding_status: 'refund_pending', holding_gross: 10,
    holding_payer: PAYER, holding_reference: 'SIG-IN', funding_state: 'cancelling', ...over,
  };
}
const ctx: RefundGuardContext = { solanaEnvironment: 'devnet', paypalEnvironment: 'live', maxPerTxUsd: 50, maxDailyUsd: 200, sentTodayUsd: 0 };

describe('refundSendAllowed: the money-direction guardrail', () => {
  it('the Phase A pocket: devnet USDC back to its payer from a cancelling orchard', () => {
    expect(refundSendAllowed(claim(), ctx)).toEqual({ ok: true });
  });

  it('a row that is not sending, or already has a reference, is parked (never sent twice)', () => {
    expect(refundSendAllowed(claim({ status: 'queued' }), ctx)).toMatchObject({ ok: false, action: 'park' });
    expect(refundSendAllowed(claim({ rail_reference: 'SIG-OUT' }), ctx)).toMatchObject({ ok: false, action: 'park', reason: expect.stringMatching(/never send twice/) });
  });

  it('the holding must be refund_pending and the orchard cancelling (or released, for a late payment)', () => {
    expect(refundSendAllowed(claim({ holding_status: 'held' }), ctx)).toMatchObject({ ok: false, action: 'park' });
    expect(refundSendAllowed(claim({ holding_status: 'refunded' }), ctx)).toMatchObject({ ok: false, action: 'park' });
    expect(refundSendAllowed(claim({ funding_state: 'open' }), ctx)).toMatchObject({ ok: false, action: 'park', reason: expect.stringMatching(/orchard is open/) });
    expect(refundSendAllowed(claim({ funding_state: 'funded' }), ctx)).toMatchObject({ ok: false, action: 'park' });
    expect(refundSendAllowed(claim({ funding_state: 'released' }), ctx)).toEqual({ ok: true });
  });

  it('amount must equal the holding gross to the cent and be positive', () => {
    expect(refundSendAllowed(claim({ amount: 9.99 }), ctx)).toMatchObject({ ok: false, action: 'park', reason: expect.stringMatching(/not the holding's gross/) });
    expect(refundSendAllowed(claim({ amount: 10.004, holding_gross: 10 }), ctx)).toEqual({ ok: true });
    expect(refundSendAllowed(claim({ amount: 0, holding_gross: 0 }), ctx)).toMatchObject({ ok: false, action: 'park' });
  });

  it('solana: destination must be the payer the chain told us', () => {
    expect(refundSendAllowed(claim({ destination: null }), ctx)).toMatchObject({ ok: false, action: 'park' });
    expect(refundSendAllowed(claim({ destination: 'BQSToMoC2iDperPSkYXVCFfgiF3LsKMxJ3iHXJhemRYw' }), ctx)).toMatchObject({ ok: false, action: 'park', reason: expect.stringMatching(/not the holding's payer/) });
    expect(refundSendAllowed(claim({ holding_payer: null, destination: PAYER }), ctx)).toMatchObject({ ok: false, action: 'park' });
  });

  it('solana: a devnet refund waits while the cluster is mainnet, and the other way round (defer, not a failure)', () => {
    expect(refundSendAllowed(claim(), { ...ctx, solanaEnvironment: 'live' })).toMatchObject({ ok: false, action: 'defer', reason: expect.stringMatching(/devnet but the worker's cluster is live/) });
    expect(refundSendAllowed(claim({ environment: 'live' }), ctx)).toMatchObject({ ok: false, action: 'defer' });
    expect(refundSendAllowed(claim({ environment: 'live' }), { ...ctx, solanaEnvironment: 'live' })).toEqual({ ok: true });
    expect(refundSendAllowed(claim({ environment: 'sandbox' }), ctx)).toMatchObject({ ok: false, action: 'park' });
  });

  it('paypal: destination must be the capture id; credentials must match the environment', () => {
    const pp = claim({ rail: 'paypal', destination: 'CAP-1', holding_reference: 'CAP-1', holding_payer: null, environment: 'live' });
    expect(refundSendAllowed(pp, ctx)).toEqual({ ok: true });
    expect(refundSendAllowed({ ...pp, destination: 'CAP-2' }, ctx)).toMatchObject({ ok: false, action: 'park' });
    expect(refundSendAllowed({ ...pp, destination: null }, ctx)).toMatchObject({ ok: false, action: 'park' });
    expect(refundSendAllowed(pp, { ...ctx, paypalEnvironment: 'sandbox' })).toMatchObject({ ok: false, action: 'defer' });
    expect(refundSendAllowed({ ...pp, environment: 'devnet' }, ctx)).toMatchObject({ ok: false, action: 'park' });
  });

  it('balance / unknown rails are not automated', () => {
    expect(refundSendAllowed(claim({ rail: 'balance', destination: 'user', holding_payer: null }), ctx)).toMatchObject({ ok: false, action: 'park', reason: expect.stringMatching(/not automated/) });
    expect(refundSendAllowed(claim({ rail: 'unknown' }), ctx)).toMatchObject({ ok: false, action: 'park' });
  });

  it('the cap is the payout circuit breaker: per transaction parks for the Squad, daily waits', () => {
    expect(refundSendAllowed(claim({ amount: 60, holding_gross: 60 }), ctx)).toMatchObject({ ok: false, action: 'park', reason: expect.stringMatching(/exceeds_per_tx_cap_needs_squad_approval/) });
    expect(refundSendAllowed(claim({ amount: 50, holding_gross: 50 }), ctx)).toEqual({ ok: true });
    expect(refundSendAllowed(claim(), { ...ctx, sentTodayUsd: 195 })).toMatchObject({ ok: false, action: 'defer', reason: expect.stringMatching(/exceeds_daily_cap/) });
    expect(refundSendAllowed(claim(), { ...ctx, sentTodayUsd: 190 })).toEqual({ ok: true });
    expect(refundSendAllowed(claim({ amount: 0.1, holding_gross: 0.1 }), { ...ctx, sentTodayUsd: 199.9 })).toEqual({ ok: true }); // floating point at the edge
  });
});

describe('attempts and fees', () => {
  it('three failed attempts and the row is failed', () => {
    expect(ORCHARD_REFUND_MAX_ATTEMPTS).toBe(3);
    expect(nextStatusAfterFailure(0)).toBe('queued');
    expect(nextStatusAfterFailure(1)).toBe('queued');
    expect(nextStatusAfterFailure(2)).toBe('failed');
  });

  it('paypal fee cost is what PayPal kept of the original fee, never negative', () => {
    expect(paypalRefundFeeCost(0.79, 0.49)).toBe(0.3);
    expect(paypalRefundFeeCost(0.79, 0.79)).toBe(0);
    expect(paypalRefundFeeCost(0.49, 0.79)).toBe(0);
    expect(paypalRefundFeeCost(null, undefined)).toBe(0);
  });

  it('usd -> raw USDC units', () => {
    expect(usdToRawUsdc(10)).toBe('10000000');
    expect(usdToRawUsdc(10.01)).toBe('10010000');
    expect(usdToRawUsdc(2.3)).toBe('2300000');
  });
});

describe('findRefundSendInParsedTxs: did it already go out?', () => {
  function tx(over: Partial<{ sig: string; amount: string; source: string; owner: string; blockTime: number; err: unknown; mint: string }> = {}): RecentParsedTx {
    return {
      signature: over.sig ?? 'SIG-OUT-1',
      blockTime: over.blockTime ?? 1_800_000_100,
      meta: {
        err: over.err ?? null,
        postTokenBalances: [
          { accountIndex: 1, mint: over.mint ?? MINT, owner: '6zbpF3HQbxFVMfUPMRzZZ52nwA7PSvqeq2Cqibq2BcxZ' },
          { accountIndex: 2, mint: over.mint ?? MINT, owner: over.owner ?? PAYER },
        ],
      },
      transaction: {
        message: {
          instructions: [
            { program: 'spl-associated-token-account', parsed: { type: 'createIdempotent', info: {} } },
            { program: 'spl-token', parsed: { type: 'transferChecked', info: { mint: over.mint ?? MINT, source: over.source ?? HOT_ATA, destination: 'payerAta', tokenAmount: { amount: over.amount ?? '10000000' } } } },
          ],
        },
      },
    };
  }
  const search = { mint: MINT, hotWalletAta: HOT_ATA, destinationOwner: PAYER, amountUsd: 10, sinceUnix: 1_800_000_000 };

  it('finds the exact send to the payer since the claim', () => {
    expect(findRefundSendInParsedTxs([tx()], search)).toBe('SIG-OUT-1');
  });

  it('ignores a different amount, a different owner, a different mint, an inbound transfer, a failed tx, or one before the claim', () => {
    expect(findRefundSendInParsedTxs([tx({ amount: '10010000' })], search)).toBeNull();
    expect(findRefundSendInParsedTxs([tx({ owner: 'someoneElse' })], search)).toBeNull();
    expect(findRefundSendInParsedTxs([tx({ mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' })], search)).toBeNull();
    expect(findRefundSendInParsedTxs([tx({ source: 'payerAta' })], search)).toBeNull();
    expect(findRefundSendInParsedTxs([tx({ err: { InstructionError: [1, 'x'] } })], search)).toBeNull();
    expect(findRefundSendInParsedTxs([tx({ blockTime: 1_799_999_000 })], search)).toBeNull();
    expect(findRefundSendInParsedTxs([], search)).toBeNull();
  });

  it('returns the first match among several', () => {
    expect(findRefundSendInParsedTxs([tx({ sig: 'A', amount: '5000000' }), tx({ sig: 'B' }), tx({ sig: 'C' })], search)).toBe('B');
  });
});
