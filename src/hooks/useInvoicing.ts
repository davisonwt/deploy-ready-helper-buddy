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

export interface LineItemRow {
  id: string;
  invoice_id: string;
  position: number;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  taxable: boolean;
  tax_rate_percent: number;
  line_total: number;
  books_item_id: string | null;
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

/** Create a draft invoice with its line items in one call, then fetch it back with lines. */
export async function createDraftInvoice(
  businessId: string,
  customerId: string,
  lines: DraftLine[],
  notesToCustomer: string | null
): Promise<{ invoiceId: string; number: string }> {
  const { data: number, error: numErr } = await supabase.rpc('next_invoice_number' as any, { _business_id: businessId } as any);
  if (numErr) throw numErr;

  const totals = computeInvoiceTotalsFromLines(lines);
  const { data: invoice, error: invErr } = await supabase
    .from('invoices' as any)
    .insert({
      business_id: businessId,
      customer_id: customerId,
      number,
      status: 'draft',
      subtotal: totals.subtotal,
      tax_total: totals.taxTotal,
      total: totals.total,
      notes_to_customer: notesToCustomer,
    } as any)
    .select('id, number')
    .single();
  if (invErr || !invoice) throw invErr ?? new Error('Could not create the invoice');

  if (lines.length > 0) {
    const { error: lineErr } = await supabase.from('line_items' as any).insert(
      lines.map((l, i) => ({
        invoice_id: (invoice as any).id,
        position: i,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price: l.unit_price,
        taxable: l.taxable,
        tax_rate_percent: l.tax_rate_percent,
        books_item_id: l.books_item_id,
      })) as any
    );
    if (lineErr) throw lineErr;
  }

  return { invoiceId: (invoice as any).id, number: (invoice as any).number };
}

export async function sendInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('invoices' as any)
    .update({ status: 'sent', sent_at: new Date().toISOString() } as any)
    .eq('id', invoiceId);
  if (error) throw error;
  await supabase.from('document_events' as any).insert({
    document_kind: 'invoice',
    document_id: invoiceId,
    event: 'sent',
    from_state: 'draft',
    to_state: 'sent',
    actor: 'member',
  } as any);
}

export async function voidInvoice(invoiceId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('invoices' as any)
    .update({ status: 'void', voided_at: new Date().toISOString(), void_reason: reason } as any)
    .eq('id', invoiceId);
  if (error) throw error;
  await supabase.from('document_events' as any).insert({
    document_kind: 'invoice',
    document_id: invoiceId,
    event: 'void',
    to_state: 'void',
    actor: 'member',
    notes: reason,
  } as any);
}

export async function fetchLineItems(invoiceId: string): Promise<LineItemRow[]> {
  const { data, error } = await supabase
    .from('line_items' as any)
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('position', { ascending: true });
  if (error) throw error;
  return ((data as any[]) ?? []).map((r) => ({
    ...r,
    quantity: num(r, 'quantity'),
    unit_price: num(r, 'unit_price'),
    tax_rate_percent: num(r, 'tax_rate_percent'),
    line_total: num(r, 'line_total'),
  })) as LineItemRow[];
}

/** Pure totals math, exported for the unit test twin. Mirrors line_items.line_total's own generated-column formula. */
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
