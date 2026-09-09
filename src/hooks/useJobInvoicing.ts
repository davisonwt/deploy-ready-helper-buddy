import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toNumber } from '@/lib/books/format';

export interface JobNoteRow {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  date_needed: string | null;
  location: string | null;
  status: 'planning' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  sower_user_id: string;
  notes_to_supplier: string | null;
  chat_channel_id: string | null;
  created_at: string;
}

export interface SupplierQuoteRow {
  id: string;
  job_notes_id: string;
  supplier_name: string;
  amount: number;
  currency: string;
  attached_document_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerRow {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  member_user_id: string | null;
  invite_token: string | null;
  invite_expires_at: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface EstimateRow {
  id: string;
  business_id: string;
  job_notes_id: string;
  customer_id: string;
  number: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  subtotal: number;
  tax_total: number;
  total: number;
  public_token: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  sent_at: string | null;
  created_at: string;
  customer_name: string | null;
  job_title: string | null;
}

export interface InvoiceRow {
  id: string;
  business_id: string;
  customer_id: string;
  estimate_id: string;
  job_notes_id: string;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  kind: 'standard' | 'deposit' | 'milestone' | 'balance';
  total: number;
  amount_paid: number;
  amount_due: number;
  due_at: string | null;
  public_token: string;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  customer_name: string | null;
}

const num = (row: any, key: string) => toNumber(row?.[key]);

export function useJobInvoicing(businessId: string | null) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobNoteRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  const reload = useCallback(async () => {
    if (!businessId) {
      setJobs([]); setCustomers([]); setEstimates([]); setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [jb, cu, es, inv] = await Promise.all([
        supabase.from('job_notes' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('customers' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('estimates' as any).select('*, customers(name), job_notes(title)').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('invoices' as any).select('*, customers(name)').eq('business_id', businessId).order('created_at', { ascending: false }),
      ]);
      setJobs(((jb.data as any[]) ?? []) as JobNoteRow[]);
      setCustomers(((cu.data as any[]) ?? []) as CustomerRow[]);
      setEstimates(
        ((es.data as any[]) ?? []).map((r) => ({
          ...r, subtotal: num(r, 'subtotal'), tax_total: num(r, 'tax_total'), total: num(r, 'total'),
          customer_name: r.customers?.name ?? null, job_title: r.job_notes?.title ?? null,
        })) as EstimateRow[]
      );
      setInvoices(
        ((inv.data as any[]) ?? []).map((r) => ({
          ...r, total: num(r, 'total'), amount_paid: num(r, 'amount_paid'), amount_due: num(r, 'amount_due'),
          customer_name: r.customers?.name ?? null,
        })) as InvoiceRow[]
      );
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { reload(); }, [reload]);

  return { loading, jobs, customers, estimates, invoices, reload };
}

export async function createCustomer(
  businessId: string,
  input: { name: string; email: string; phone?: string | null; address?: string | null }
): Promise<{ customer: CustomerRow; isMember: boolean }> {
  const { data: existingMemberId } = await supabase.rpc('find_member_by_email' as any, { _email: input.email } as any);
  const isMember = Boolean(existingMemberId);
  const { data, error } = await supabase
    .from('customers' as any)
    .insert({
      business_id: businessId,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      member_user_id: isMember ? existingMemberId : null,
      invite_token: isMember ? null : crypto.randomUUID(),
      invite_expires_at: isMember ? null : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    } as any)
    .select('*')
    .single();
  if (error) throw error;
  return { customer: data as any as CustomerRow, isMember };
}

export async function createJobNote(input: {
  businessId: string; title: string; description: string | null; dateNeeded: string | null; location: string | null; notesToSupplier: string | null;
}): Promise<JobNoteRow> {
  const { data, error } = await supabase.rpc('create_job_note' as any, {
    _business_id: input.businessId,
    _title: input.title,
    _description: input.description,
    _date_needed: input.dateNeeded,
    _location: input.location,
    _notes_to_supplier: input.notesToSupplier,
  } as any);
  if (error) throw error;
  return data as any as JobNoteRow;
}

export async function addSupplierQuote(jobNotesId: string, supplierName: string, amount: number, notes?: string | null): Promise<void> {
  const { error } = await supabase.from('supplier_quotes' as any).insert({
    job_notes_id: jobNotesId, supplier_name: supplierName, amount, notes: notes ?? null,
  } as any);
  if (error) throw error;
}

export interface DraftLine {
  description: string; quantity: number; unit: string | null; unit_price: number; taxable: boolean; tax_rate_percent: number;
}
export interface DraftScheduleItem {
  label: string; percentageOfTotal: number | null; fixedAmount: number | null; amount: number;
  triggerType: 'date' | 'job_status'; dueOffsetDays: number | null; triggerJobStatus: 'job_50pct' | 'job_completion' | null;
}

/** A schedule item's dollar amount, mirroring payment_schedule_items' documented
 *  client-computed `amount` column (a cross-table generated column isn't
 *  possible in Postgres, so the client computes it once at build time). */
export function computeScheduleAmount(item: { percentageOfTotal: number | null; fixedAmount: number | null }, total: number): number {
  if (item.fixedAmount != null) return round2(item.fixedAmount);
  if (item.percentageOfTotal != null) return round2((item.percentageOfTotal / 100) * total);
  return 0;
}

export function computeEstimateTotals(lines: DraftLine[]): { subtotal: number; taxTotal: number; total: number } {
  let subtotal = 0, taxTotal = 0;
  for (const l of lines) {
    const lineTotal = round2(l.quantity * l.unit_price);
    subtotal += lineTotal;
    if (l.taxable) taxTotal += round2(lineTotal * (l.tax_rate_percent / 100));
  }
  subtotal = round2(subtotal); taxTotal = round2(taxTotal);
  return { subtotal, taxTotal, total: round2(subtotal + taxTotal) };
}

export async function createDraftEstimate(
  businessId: string, jobNotesId: string, customerId: string, lines: DraftLine[], schedule: DraftScheduleItem[]
): Promise<{ estimateId: string }> {
  const { data: number, error: numErr } = await supabase.rpc('next_estimate_number' as any, { _business_id: businessId } as any);
  if (numErr) throw numErr;
  const totals = computeEstimateTotals(lines);

  const { data: estimate, error: estErr } = await supabase
    .from('estimates' as any)
    .insert({
      business_id: businessId, job_notes_id: jobNotesId, customer_id: customerId, number,
      subtotal: totals.subtotal, tax_total: totals.taxTotal, total: totals.total,
    } as any)
    .select('id')
    .single();
  if (estErr || !estimate) throw estErr ?? new Error('Could not create the estimate');
  const estimateId = (estimate as any).id;

  if (lines.length > 0) {
    const { error } = await supabase.from('line_items' as any).insert(
      lines.map((l, i) => ({ estimate_id: estimateId, position: i, ...l, unit_price: l.unit_price })) as any
    );
    if (error) throw error;
  }
  if (schedule.length > 0) {
    const { error } = await supabase.from('payment_schedule_items' as any).insert(
      schedule.map((s, i) => ({
        estimate_id: estimateId, position: i, label: s.label,
        percentage_of_total: s.percentageOfTotal, fixed_amount: s.fixedAmount, amount: s.amount,
        trigger_type: s.triggerType, due_offset_days: s.dueOffsetDays, trigger_job_status: s.triggerJobStatus,
      })) as any
    );
    if (error) throw error;
  }
  return { estimateId };
}

export async function sendEstimate(estimateId: string): Promise<void> {
  const { error } = await supabase.rpc('send_estimate' as any, { _estimate_id: estimateId } as any);
  if (error) throw error;
}

export async function markJobProgress(jobNotesId: string, milestone: 'job_50pct' | 'job_completion'): Promise<void> {
  const { error } = await supabase.rpc('mark_job_progress' as any, { _job_notes_id: jobNotesId, _milestone: milestone } as any);
  if (error) throw error;
}

export async function voidInvoice(invoiceId: string, reason: string | null): Promise<void> {
  const { error } = await supabase.rpc('void_invoice' as any, { _invoice_id: invoiceId, _reason: reason } as any);
  if (error) throw error;
}

export interface PublicEstimate {
  id: string; number: string; status: 'draft' | 'sent' | 'approved' | 'rejected';
  job_title: string | null; job_location: string | null; job_date_needed: string | null;
  subtotal: number; tax_total: number; total: number; customer_name: string | null;
  line_items: { description: string; quantity: number; unit: string | null; unit_price: number; taxable: boolean; tax_rate_percent: number; line_total: number }[];
  payment_schedule: { label: string; amount: number; trigger_type: 'date' | 'job_status'; trigger_job_status: string | null; due_offset_days: number | null }[];
  supplier_quotes: { supplier_name: string; amount: number; currency: string }[];
}

export async function getPublicEstimate(token: string): Promise<PublicEstimate | null> {
  const { data, error } = await supabase.rpc('get_public_estimate' as any, { _token: token } as any);
  if (error) throw error;
  return (data as any as PublicEstimate) ?? null;
}

export async function approveEstimate(estimateId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_estimate' as any, { _estimate_id: estimateId } as any);
  if (error) throw error;
}

export async function rejectEstimate(estimateId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_estimate' as any, { _estimate_id: estimateId, _reason: reason } as any);
  if (error) throw error;
}

export interface InvitePreview { business_name: string; email: string | null }

export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase.rpc('get_invite_preview' as any, { _token: token } as any);
  if (error) throw error;
  return (data as any as InvitePreview) ?? null;
}

export async function claimCustomerInvite(token: string): Promise<{ ok: boolean; error?: string; customer_id?: string }> {
  const { data, error } = await supabase.rpc('claim_customer_invite' as any, { _token: token } as any);
  if (error) throw error;
  return data as any;
}

export async function fetchSupplierQuotes(jobNotesId: string): Promise<SupplierQuoteRow[]> {
  const { data, error } = await supabase.from('supplier_quotes' as any).select('*').eq('job_notes_id', jobNotesId).order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as any[]) ?? []).map((r) => ({ ...r, amount: toNumber(r.amount) })) as SupplierQuoteRow[];
}

export async function fetchJobInvoices(jobNotesId: string): Promise<InvoiceRow[]> {
  const { data, error } = await supabase.from('invoices' as any).select('*, customers(name)').eq('job_notes_id', jobNotesId).order('created_at', { ascending: true });
  if (error) throw error;
  return ((data as any[]) ?? []).map((r) => ({
    ...r, total: num(r, 'total'), amount_paid: num(r, 'amount_paid'), amount_due: num(r, 'amount_due'),
    customer_name: r.customers?.name ?? null,
  })) as InvoiceRow[];
}

export interface JobEventRow {
  id: string; job_notes_id: string; event_type: string; from_state: string | null; to_state: string | null;
  actor: string; actor_ref: string | null; notes: string | null; created_at: string;
}

export async function fetchJobEvents(jobNotesId: string): Promise<JobEventRow[]> {
  const { data, error } = await supabase.from('job_events' as any).select('*').eq('job_notes_id', jobNotesId).order('created_at', { ascending: true });
  if (error) throw error;
  return ((data as any[]) ?? []) as JobEventRow[];
}

export async function fetchEstimatesForJob(jobNotesId: string): Promise<EstimateRow[]> {
  const { data, error } = await supabase.from('estimates' as any).select('*, customers(name)').eq('job_notes_id', jobNotesId).order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as any[]) ?? []).map((r) => ({
    ...r, subtotal: num(r, 'subtotal'), tax_total: num(r, 'tax_total'), total: num(r, 'total'),
    customer_name: r.customers?.name ?? null, job_title: null,
  })) as EstimateRow[];
}

export async function fetchJobById(jobNotesId: string): Promise<JobNoteRow | null> {
  const { data, error } = await supabase.from('job_notes' as any).select('*').eq('id', jobNotesId).maybeSingle();
  if (error) throw error;
  return (data as any as JobNoteRow) ?? null;
}

export async function fetchEstimateLines(estimateId: string): Promise<DraftLine[]> {
  const { data, error } = await supabase.from('line_items' as any).select('*').eq('estimate_id', estimateId).order('position', { ascending: true });
  if (error) throw error;
  return ((data as any[]) ?? []).map((r) => ({
    description: r.description, quantity: toNumber(r.quantity), unit: r.unit,
    unit_price: toNumber(r.unit_price), taxable: r.taxable, tax_rate_percent: toNumber(r.tax_rate_percent),
  })) as DraftLine[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
