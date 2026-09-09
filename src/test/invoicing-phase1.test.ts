import { describe, it, expect } from 'vitest';
import { computeInvoiceTotalsFromLines, type DraftLine } from '@/hooks/useInvoicing';

// Member invoicing Phase 1 (MEMBER-INVOICING-PLAN.md section 2, 4).
// computeInvoiceTotalsFromLines mirrors line_items.line_total's own
// generated-column formula (quantity * unit_price, rounded) plus the
// invoice-level subtotal/tax_total/total aggregation the client computes
// on every keystroke -- this is that math, isolated and unit-tested.

const line = (over: Partial<DraftLine> = {}): DraftLine => ({
  description: 'Labour',
  quantity: 1,
  unit: null,
  unit_price: 100,
  taxable: false,
  tax_rate_percent: 0,
  books_item_id: null,
  ...over,
});

describe('computeInvoiceTotalsFromLines', () => {
  it('0% tax: total equals subtotal, no change from the raw sum', () => {
    const totals = computeInvoiceTotalsFromLines([line({ unit_price: 100, quantity: 2 }), line({ unit_price: 50, quantity: 1 })]);
    expect(totals.subtotal).toBe(250);
    expect(totals.taxTotal).toBe(0);
    expect(totals.total).toBe(250);
  });

  it('15% tax on a taxable line is computed correctly', () => {
    const totals = computeInvoiceTotalsFromLines([line({ unit_price: 100, quantity: 1, taxable: true, tax_rate_percent: 15 })]);
    expect(totals.subtotal).toBe(100);
    expect(totals.taxTotal).toBe(15);
    expect(totals.total).toBe(115);
  });

  it('mixes taxable and non-taxable lines: tax applies only to the taxable ones', () => {
    const totals = computeInvoiceTotalsFromLines([
      line({ unit_price: 100, quantity: 1, taxable: true, tax_rate_percent: 15 }),
      line({ unit_price: 50, quantity: 1, taxable: false }),
    ]);
    expect(totals.subtotal).toBe(150);
    expect(totals.taxTotal).toBe(15); // 15% of the taxable 100 only, not the full 150
    expect(totals.total).toBe(165);
  });

  it('quantity multiplies unit_price per line before summing', () => {
    const totals = computeInvoiceTotalsFromLines([line({ unit_price: 25.5, quantity: 3 })]);
    expect(totals.subtotal).toBe(76.5);
  });

  it('rounds each line to the cent before aggregating (matches the DB generated column)', () => {
    const totals = computeInvoiceTotalsFromLines([line({ unit_price: 33.333, quantity: 3, taxable: true, tax_rate_percent: 15 })]);
    // 33.333 * 3 = 99.999 -> rounds to 100.00 at the line level first
    expect(totals.subtotal).toBe(100);
    expect(totals.taxTotal).toBe(15);
  });

  it('an empty invoice totals to zero', () => {
    const totals = computeInvoiceTotalsFromLines([]);
    expect(totals).toEqual({ subtotal: 0, taxTotal: 0, total: 0 });
  });
});
