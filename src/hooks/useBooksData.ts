import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_TAX_SETTINGS, type ParsedTerms, type TaxSettings } from '@/lib/books/payroll';
import { toNumber } from '@/lib/books/format';

export interface InvoiceRow {
  id: string;
  business_id: string;
  client_name: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid';
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  business_id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  receipt_image_path: string | null;
  merchant: string | null;
  spent_on: string | null;
  source: string;
  created_at: string;
}

export interface EmployeeRow {
  id: string;
  business_id: string;
  name: string;
  role: string | null;
  pay_type: 'salary' | 'hourly';
  monthly_salary: number | null;
  hourly_rate: number | null;
  hours_per_month: number | null;
  active: boolean;
  created_at: string;
}

export interface ContractRow {
  id: string;
  business_id: string;
  employee_id: string;
  file_path: string;
  uploaded_at: string;
  parsed_terms: ParsedTerms;
  parse_status: 'pending' | 'parsed' | 'failed';
}

export interface PayrollRunRow {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  totals: Record<string, number>;
  employer_fica: number;
  total_cost: number;
  created_at: string;
}

const num = (row: any, key: string) => toNumber(row?.[key]);

export function useBooksData(businessId: string | null) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [runs, setRuns] = useState<PayrollRunRow[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);

  const reload = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [inv, exp, emp, con, run, tax] = await Promise.all([
        supabase.from('invoices' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('expenses' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('employees' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: true }),
        supabase.from('employee_contracts' as any).select('*').eq('business_id', businessId).order('uploaded_at', { ascending: false }),
        supabase.from('payroll_runs' as any).select('*').eq('business_id', businessId).order('pay_date', { ascending: false }),
        supabase.from('tax_settings' as any).select('*').eq('business_id', businessId).maybeSingle(),
      ]);

      setInvoices(((inv.data as any[]) ?? []).map((r) => ({ ...r, amount: num(r, 'amount') })) as InvoiceRow[]);
      setExpenses(((exp.data as any[]) ?? []).map((r) => ({ ...r, amount: num(r, 'amount') })) as ExpenseRow[]);
      setEmployees(((emp.data as any[]) ?? []).map((r) => ({
        ...r,
        monthly_salary: r.monthly_salary == null ? null : num(r, 'monthly_salary'),
        hourly_rate: r.hourly_rate == null ? null : num(r, 'hourly_rate'),
        hours_per_month: r.hours_per_month == null ? null : num(r, 'hours_per_month'),
      })) as EmployeeRow[]);
      setContracts(((con.data as any[]) ?? []) as ContractRow[]);
      setRuns(((run.data as any[]) ?? []).map((r) => ({
        ...r,
        employer_fica: num(r, 'employer_fica'),
        total_cost: num(r, 'total_cost'),
      })) as PayrollRunRow[]);

      const t = tax.data as any;
      setTaxSettings(
        t
          ? {
              paye_pct: toNumber(t.paye_pct),
              uif_ceiling: toNumber(t.uif_ceiling),
              sdl_applies: Boolean(t.sdl_applies),
            }
          : DEFAULT_TAX_SETTINGS
      );
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Latest parsed contract per employee — the source of truth for pay. */
  const contractByEmployee = new Map<string, ContractRow>();
  contracts.forEach((c) => {
    if (c.parse_status === 'parsed' && !contractByEmployee.has(c.employee_id)) {
      contractByEmployee.set(c.employee_id, c);
    }
  });

  return {
    loading,
    invoices,
    expenses,
    employees,
    contracts,
    contractByEmployee,
    runs,
    taxSettings,
    setTaxSettings,
    reload,
  };
}
