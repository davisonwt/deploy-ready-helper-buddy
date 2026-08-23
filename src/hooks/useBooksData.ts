import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ParsedTerms, StatutoryDeductionInput } from '@/lib/books/payroll';
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
  source_table: string | null;
  source_id: string | null;
  linked_income_id: string | null;
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
  currency: string | null;
  created_at: string;
}

export interface BooksItemRow {
  id: string;
  business_id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  kind: string;
  sku: string | null;
  unit_price: number;
  currency: string;
  source: string;
  active: boolean;
  created_at: string;
}

export interface BooksIncomeRow {
  id: string;
  business_id: string;
  income_type: 'sale' | 'gift';
  item_id: string | null;
  description: string;
  amount: number;
  platform_fee: number;
  currency: string;
  payment_method: string | null;
  buyer_reference: string | null;
  source_table: string;
  source_id: string;
  occurred_at: string;
}

export interface StatutoryDeductionRow extends StatutoryDeductionInput {
  id: string;
  business_id: string;
}

const num = (row: any, key: string) => toNumber(row?.[key]);

export function useBooksData(businessId: string | null) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [runs, setRuns] = useState<PayrollRunRow[]>([]);
  const [deductions, setDeductions] = useState<StatutoryDeductionRow[]>([]);
  const [items, setItems] = useState<BooksItemRow[]>([]);
  const [income, setIncome] = useState<BooksIncomeRow[]>([]);

  const reload = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [inv, exp, emp, con, run, ded, itm, inc] = await Promise.all([
        supabase.from('invoices' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('expenses' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('employees' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: true }),
        supabase.from('employee_contracts' as any).select('*').eq('business_id', businessId).order('uploaded_at', { ascending: false }),
        supabase.from('payroll_runs' as any).select('*').eq('business_id', businessId).order('pay_date', { ascending: false }),
        supabase.from('statutory_deductions' as any).select('*').eq('business_id', businessId).order('sort_order', { ascending: true }),
        supabase.from('books_items' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('books_income' as any).select('*').eq('business_id', businessId).order('occurred_at', { ascending: false }),
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
      setDeductions(((ded.data as any[]) ?? []).map((r) => ({
        ...r,
        employee_pct: num(r, 'employee_pct'),
        employer_pct: num(r, 'employer_pct'),
        wage_cap: r.wage_cap == null ? null : num(r, 'wage_cap'),
      })) as StatutoryDeductionRow[]);
      setItems(((itm.data as any[]) ?? []).map((r) => ({ ...r, unit_price: num(r, 'unit_price') })) as BooksItemRow[]);
      setIncome(((inc.data as any[]) ?? []).map((r) => ({
        ...r,
        amount: num(r, 'amount'),
        platform_fee: num(r, 'platform_fee'),
      })) as BooksIncomeRow[]);
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
    deductions,
    items,
    income,
    reload,
  };
}
