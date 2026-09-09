import { describe, it, expect } from 'vitest';
import { computeEstimateTotals, computeScheduleAmount, type DraftLine } from '@/hooks/useJobInvoicing';

// Books Phase 4 invoicing -- Phase 1 (full workflow, jobs/estimates).
// The state-machine behaviors (approval -> N invoices, milestone triggers,
// job auto-completion, invite/claim safety) all live in Postgres RPCs and
// are proven end-to-end by scripts/studio/phase-1-job-invoicing-tests.sql
// (32/32 passing against the live schema under real RLS). What's unit-
// tested here is the pure math that actually runs in the browser: the
// estimate line-item totals (same formula as Phase 1's invoice lines) and
// the payment-schedule amount computation, since payment_schedule_items.amount
// is a client-computed column (a cross-table generated column isn't
// possible in Postgres -- see the migration's own comment on that column).

const line = (over: Partial<DraftLine> = {}): DraftLine => ({
  description: 'Labour', quantity: 1, unit: null, unit_price: 100, taxable: false, tax_rate_percent: 0, ...over,
});

describe('computeEstimateTotals', () => {
  it('sums line totals with no tax', () => {
    const totals = computeEstimateTotals([line({ unit_price: 100, quantity: 2 }), line({ unit_price: 50, quantity: 1 })]);
    expect(totals).toEqual({ subtotal: 250, taxTotal: 0, total: 250 });
  });

  it('applies tax only to taxable lines', () => {
    const totals = computeEstimateTotals([
      line({ unit_price: 100, taxable: true, tax_rate_percent: 15 }),
      line({ unit_price: 50, taxable: false }),
    ]);
    expect(totals.subtotal).toBe(150);
    expect(totals.taxTotal).toBe(15);
    expect(totals.total).toBe(165);
  });

  it('an empty estimate totals to zero', () => {
    expect(computeEstimateTotals([])).toEqual({ subtotal: 0, taxTotal: 0, total: 0 });
  });
});

describe('computeScheduleAmount', () => {
  it('computes a percentage slice of the estimate total', () => {
    expect(computeScheduleAmount({ percentageOfTotal: 50, fixedAmount: null }, 1000)).toBe(500);
  });

  it('computes an uneven percentage split correctly (deposit + balance)', () => {
    const total = 1230.5;
    const deposit = computeScheduleAmount({ percentageOfTotal: 30, fixedAmount: null }, total);
    const balance = computeScheduleAmount({ percentageOfTotal: 70, fixedAmount: null }, total);
    expect(deposit).toBe(369.15);
    expect(balance).toBe(861.35);
    expect(Math.round((deposit + balance) * 100) / 100).toBe(total);
  });

  it('a fixed amount ignores the estimate total entirely', () => {
    expect(computeScheduleAmount({ percentageOfTotal: null, fixedAmount: 250 }, 10000)).toBe(250);
  });

  it('rounds to the cent', () => {
    expect(computeScheduleAmount({ percentageOfTotal: 33.33, fixedAmount: null }, 100)).toBe(33.33);
  });

  it('neither field set (should never happen given the DB CHECK constraint) yields zero, not NaN', () => {
    expect(computeScheduleAmount({ percentageOfTotal: null, fixedAmount: null }, 500)).toBe(0);
  });
});
