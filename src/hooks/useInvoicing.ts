import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toNumber } from '@/lib/books/format';

export interface CustomerRow {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  member_user_id: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  business_id: string;
  customer_id: string;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  kind: 'standard' | 'deposit' | 'balance';
  currency_display: string;
  subtotal: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  due_at: string | null;
  notes_to_customer: string | null;
  public_token: string;
  sent_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  customer_name: string | null;
}

const num = (row: any, key: string) => toNumber(row?.[key]);

export function useInvoicing(businessId: string | null) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  const reload = useCallback(async () => {
    if (!businessId) {
      setCustomers([]);
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cust, inv] = await Promise.all([
        supabase.from('customers' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase
          .from('invoices' as any)
          .select('*, customers(name)')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),
      ]);
      setCustomers(((cust.data as any[]) ?? []) as CustomerRow[]);
      setInvoices(
        ((inv.data as any[]) ?? []).map((r) => ({
          ...r,
          subtotal: num(r, 'subtotal'),
          tax_total: num(r, 'tax_total'),
          total: num(r, 'total'),
          amount_paid: num(r, 'amount_paid'),
          amount_due: num(r, 'amount_due'),
          customer_name: r.customers?.name ?? null,
        })) as InvoiceRow[]
      );
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createCustomer = useCallback(
    async (input: { name: string; email?: string | null; phone?: string | null; address?: string | null }) => {
      if (!businessId) throw new Error('No business selected');
      const { data, error } = await supabase
        .from('customers' as any)
        .insert({
          business_id: businessId,
          name: input.name.trim(),
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          address: input.address?.trim() || null,
        } as any)
        .select('*')
        .single();
      if (error) throw error;
      await reload();
      return data as any as CustomerRow;
    },
    [businessId, reload]
  );

  return { loading, customers, invoices, reload, createCustomer };
}

export interface DraftLine {
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  taxable: boolean;
  tax_rate_percent: number;
  books_item_id: string | null;
}

/**
 * Pure totals math, exported for the unit test twin. Mirrors
 * line_items.line_total's own generated-column formula. Still used by
 * EstimateBuilderPage's twin (useJobInvoicing's computeEstimateTotals) --
 * kept here too since src/test/invoicing-phase1.test.ts pins this one.
 */
export function computeInvoiceTotalsFromLines(lines: DraftLine[]): { subtotal: number; taxTotal: number; total: number } {
  let subtotal = 0;
  let taxTotal = 0;
  for (const l of lines) {
    const lineTotal = round2(l.quantity * l.unit_price);
    subtotal += lineTotal;
    if (l.taxable) taxTotal += round2(lineTotal * (l.tax_rate_percent / 100));
  }
  subtotal = round2(subtotal);
  taxTotal = round2(taxTotal);
  return { subtotal, taxTotal, total: round2(subtotal + taxTotal) };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
