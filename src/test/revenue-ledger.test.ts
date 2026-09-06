// Bookkeeping Phase 1: the revenue ledger rules (TypeScript twin of
// public.record_revenue / public.revenue_summary, see
// supabase/functions/_shared/revenueRules.ts and the migration
// 20260906120000_revenue_ledger.sql). The database side of the same rules
// is proven by scripts/studio/revenue-ledger-tests.sql.

import { describe, it, expect } from 'vitest';
import {
  ALL_KINDS,
  COST_KINDS,
  INCOME_KINDS,
  dedupe,
  environmentFor,
  environmentFromPaypalEnv,
  environmentFromSolanaCluster,
  isReleasedSource,
  railFor,
  revenueKey,
  signMatchesDirection,
  signedAmount,
  summarize,
  type RevenueRow,
} from '../../supabase/functions/_shared/revenueRules';

describe('signedAmount / direction (mirrors record_revenue + the sign CHECK)', () => {
  it('income kinds are stored positive and refuse a negative amount', () => {
    for (const k of INCOME_KINDS) {
      expect(signedAmount(k, 0.3)).toEqual({ direction: 'income', amount: 0.3 });
      expect(() => signedAmount(k, -0.3)).toThrow(/must be positive/);
    }
  });
  it('cost kinds are always stored negative, whatever sign is passed', () => {
    for (const k of COST_KINDS) {
      expect(signedAmount(k, 0.49)).toEqual({ direction: 'cost', amount: -0.49 });
      expect(signedAmount(k, -0.49)).toEqual({ direction: 'cost', amount: -0.49 });
    }
  });
  it('correction and opening_balance take their direction from the sign', () => {
    expect(signedAmount('correction', 5)).toEqual({ direction: 'income', amount: 5 });
    expect(signedAmount('correction', -5)).toEqual({ direction: 'cost', amount: -5 });
    expect(signedAmount('opening_balance', -13.95)).toEqual({ direction: 'cost', amount: -13.95 });
  });
  it('zero is nothing to record, never a row', () => {
    for (const k of ALL_KINDS) expect(signedAmount(k, 0)).toBeNull();
    expect(signedAmount('sale_fee', 0.004)).toBeNull(); // rounds to 0.00
  });
  it('rejects an unknown kind', () => {
    expect(() => signedAmount('tip' as never, 1)).toThrow(/unknown kind/);
  });
  it('every stored row satisfies the sign CHECK', () => {
    const rows = ALL_KINDS.flatMap((k) => [signedAmount(k, 1.5), COST_KINDS.includes(k) || k === 'correction' ? signedAmount(k, -1.5) : null]);
    for (const r of rows) if (r) expect(signMatchesDirection(r.direction, r.amount)).toBe(true);
    expect(signMatchesDirection('income', -1)).toBe(false);
    expect(signMatchesDirection('cost', 1)).toBe(false);
  });
});

describe('environment (test money can never become a live figure)', () => {
  it('solana: only mainnet-beta is live; devnet, testnet, unknown are devnet', () => {
    expect(environmentFromSolanaCluster('mainnet-beta')).toBe('live');
    expect(environmentFromSolanaCluster('devnet')).toBe('devnet');
    expect(environmentFromSolanaCluster('testnet')).toBe('devnet');
    expect(environmentFromSolanaCluster(null)).toBe('devnet');
    expect(environmentFromSolanaCluster(undefined)).toBe('devnet');
  });
  it('paypal: sandbox is sandbox, everything else is live', () => {
    expect(environmentFromPaypalEnv('sandbox')).toBe('sandbox');
    expect(environmentFromPaypalEnv('live')).toBe('live');
    expect(environmentFromPaypalEnv('')).toBe('live');
    expect(environmentFromPaypalEnv(undefined)).toBe('live');
  });
  it('by provider: balance, nowpayments and legacy rows are live', () => {
    expect(environmentFor({ provider: 'solana', solanaCluster: 'devnet' })).toBe('devnet');
    expect(environmentFor({ provider: 'solana', solanaCluster: 'mainnet-beta' })).toBe('live');
    expect(environmentFor({ provider: 'paypal', paypalEnv: 'sandbox' })).toBe('sandbox');
    expect(environmentFor({ provider: 'balance' })).toBe('live');
    expect(environmentFor({ provider: 'nowpayments' })).toBe('live');
    expect(environmentFor({ provider: null })).toBe('live');
  });
  it('rail follows the provider', () => {
    expect(railFor('solana')).toBe('solana');
    expect(railFor('paypal')).toBe('paypal');
    expect(railFor('balance')).toBe('balance');
    expect(railFor(null)).toBe('none');
  });
});

describe('source guard (income only for a released source)', () => {
  it('product sale: completed only', () => {
    expect(isReleasedSource('sale_fee', 'product_bestowals', { status: 'completed' })).toBe(true);
    expect(isReleasedSource('sale_fee', 'product_bestowals', { status: 'pending' })).toBe(false);
    expect(isReleasedSource('sale_fee', 'product_bestowals', { status: 'expired' })).toBe(false);
  });
  it('gift: completed/distributed and NOT an orchard row (orchard money is held until Phase B)', () => {
    expect(isReleasedSource('gift_fee', 'bestowals', { payment_status: 'completed', orchard_id: null })).toBe(true);
    expect(isReleasedSource('gift_fee', 'bestowals', { payment_status: 'distributed', orchard_id: null })).toBe(true);
    expect(isReleasedSource('gift_fee', 'bestowals', { payment_status: 'completed', orchard_id: 'o1' })).toBe(false);
    expect(isReleasedSource('gift_fee', 'bestowals', { payment_status: 'pending', orchard_id: null })).toBe(false);
  });
  it('content: payment_status completed; booking: paid; payout fee: paid', () => {
    expect(isReleasedSource('content_fee', 'content_purchases', { payment_status: 'completed' })).toBe(true);
    expect(isReleasedSource('content_fee', 'content_purchases', { payment_status: 'pending' })).toBe(false);
    expect(isReleasedSource('booking_fee', 'bookings', { status: 'paid' })).toBe(true);
    expect(isReleasedSource('booking_fee', 'bookings', { status: 'accepted' })).toBe(false);
    expect(isReleasedSource('payout_fee_cost', 'payouts', { status: 'paid' })).toBe(true);
    expect(isReleasedSource('payout_fee_cost', 'payouts', { status: 'failed' })).toBe(false);
  });
  it('orchard_fee needs an orchard_releases row (the Phase B seam)', () => {
    expect(isReleasedSource('orchard_fee', 'orchard_releases', { exists: true })).toBe(true);
    expect(isReleasedSource('orchard_fee', 'orchard_releases', { exists: false })).toBe(false);
    expect(isReleasedSource('orchard_fee', 'bestowals', { payment_status: 'completed', orchard_id: 'o1' })).toBe(false);
  });
  it('unknown kind/source pairs and missing rows are refused; corrections need no source', () => {
    expect(isReleasedSource('sale_fee', 'bestowals', { payment_status: 'completed' })).toBe(false);
    expect(isReleasedSource('sale_fee', 'product_bestowals', null)).toBe(false);
    expect(isReleasedSource('sale_fee', 'nonsense', { status: 'completed' })).toBe(false);
    expect(isReleasedSource('correction', null, null)).toBe(true);
    expect(isReleasedSource('opening_balance', null, null)).toBe(true);
  });
});

describe('idempotency (UNIQUE kind, source_table, source_id)', () => {
  it('a second row for the same source is dropped; corrections and source-less rows are exempt', () => {
    const rows = [
      { kind: 'sale_fee', source_table: 'product_bestowals', source_id: 'a' },
      { kind: 'sale_fee', source_table: 'product_bestowals', source_id: 'a' },
      { kind: 'refund_cost', source_table: 'product_bestowals', source_id: 'a' },
      { kind: 'correction', source_table: null, source_id: null },
      { kind: 'correction', source_table: null, source_id: null },
      { kind: 'opening_balance', source_table: null, source_id: null },
    ] as const;
    const kept = dedupe([...rows]);
    expect(kept).toHaveLength(5);
    expect(revenueKey(rows[0])).toBe('sale_fee|product_bestowals|a');
    expect(revenueKey(rows[3])).toBeNull();
  });
});

describe('revenue_summary (environment filter, period, net vs operating net)', () => {
  const rows: RevenueRow[] = [
    { kind: 'sale_fee', direction: 'income', amount: 0.3, environment: 'live', recognised_at: '2026-08-28T10:00:00Z' },
    { kind: 'sale_fee', direction: 'income', amount: 0.3, environment: 'live', recognised_at: '2026-09-03T10:00:00Z' },
    { kind: 'sale_fee', direction: 'income', amount: 0.3, environment: 'devnet', recognised_at: '2026-09-03T11:00:00Z' },
    { kind: 'orchard_fee', direction: 'income', amount: 1.3, environment: 'devnet', recognised_at: '2026-09-06T07:21:00Z' },
    { kind: 'payout_fee_cost', direction: 'cost', amount: -0.25, environment: 'live', recognised_at: '2026-09-05T02:00:00Z' },
    { kind: 'opening_balance', direction: 'cost', amount: -13.95, environment: 'live', recognised_at: '2026-09-06T00:00:00Z' },
  ];
  it('live by default: devnet rows never count', () => {
    const s = summarize(rows);
    expect(s.rows).toBe(4);
    expect(s.by_kind).toEqual({ sale_fee: 0.6, payout_fee_cost: -0.25, opening_balance: -13.95 });
    expect(s.income_total).toBe(0.6);
    expect(s.cost_total).toBe(-14.2);
    expect(s.net).toBe(-13.6);
    expect(s.operating_net).toBe(0.35); // opening balance excluded
  });
  it('devnet on request shows only test money', () => {
    const s = summarize(rows, { environment: 'devnet' });
    expect(s.by_kind).toEqual({ sale_fee: 0.3, orchard_fee: 1.3 });
    expect(s.net).toBe(1.6);
  });
  it('a period narrows to that month (UTC)', () => {
    const s = summarize(rows, { period: '2026-08' });
    expect(s.period).toBe('2026-08');
    expect(s.rows).toBe(1);
    expect(s.net).toBe(0.3);
  });
});
