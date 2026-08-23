/**
 * Jurisdiction-agnostic payroll maths.
 *
 * Books does NOT assume any country's tax structure. A business configures a
 * list of statutory deductions — each one is {label, employee %, employer %,
 * optional wage cap, applies} — and payroll is computed purely from that list.
 * Tax codes on line items are free text and blank unless the business set one.
 *
 * Nothing here is tax advice. Rates, caps and codes are whatever the business
 * entered and must be verified with their own tax authority.
 */
import { toNumber } from './format';

export interface StatutoryDeductionInput {
  id?: string;
  label: string;
  employee_pct: number;
  employer_pct: number;
  /** Monthly wage cap the percentages apply up to. Null = no cap. */
  wage_cap: number | null;
  applies: boolean;
  /** Free-text reporting code for this deduction. Blank by default. */
  tax_code?: string | null;
  sort_order?: number;
}

export interface ContractAllowance {
  label: string;
  amount: number;
  /** Free-text code. `sars_code` is still read for older parsed contracts. */
  tax_code?: string | null;
  sars_code?: string | null;
}

export interface ParsedTerms {
  job_title?: string | null;
  start_date?: string | null;
  basic_salary?: number | null;
  allowances?: ContractAllowance[] | null;
}

export interface PayrollEmployeeInput {
  id: string;
  name: string;
  role?: string | null;
  pay_type: 'salary' | 'hourly';
  monthly_salary?: number | null;
  hourly_rate?: number | null;
  hours_per_month?: number | null;
  /** Parsed contract terms — when present these override manual rates. */
  contract?: ParsedTerms | null;
  /** Extra voluntary deductions (loans, garnishees, etc). */
  extra_deductions?: number;
}

export interface PayrollLineItem {
  label: string;
  /** Free text, blank unless a code was configured. */
  tax_code: string;
  amount: number;
  kind: 'earning' | 'deduction' | 'employer';
}

export interface DeductionBreakdown {
  label: string;
  tax_code: string;
  employee_amount: number;
  employer_amount: number;
}

export interface PayrollLineResult {
  employee_id: string;
  employee_name: string;
  source: 'contract' | 'manual';
  gross: number;
  employee_statutory: number;
  employer_statutory: number;
  deductions: number;
  net: number;
  breakdown: DeductionBreakdown[];
  line_items: PayrollLineItem[];
}

/** Free-text codes used on generic earning lines. Blank unless preset supplies. */
export interface LineCodes {
  basic?: string;
  allowance?: string;
  gross?: string;
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/** Basic pay + allowances for one employee. Contract wins over manual rates. */
export function resolveEarnings(emp: PayrollEmployeeInput): {
  source: 'contract' | 'manual';
  basic: number;
  allowances: ContractAllowance[];
} {
  const contract = emp.contract;
  const contractBasic = toNumber(contract?.basic_salary);
  if (contract && contractBasic > 0) {
    return {
      source: 'contract',
      basic: round2(contractBasic),
      allowances: (contract.allowances ?? []).map((a) => ({
        label: a.label || 'Allowance',
        amount: round2(toNumber(a.amount)),
        tax_code: a.tax_code ?? a.sars_code ?? null,
      })),
    };
  }

  const basic =
    emp.pay_type === 'hourly'
      ? toNumber(emp.hourly_rate) * toNumber(emp.hours_per_month)
      : toNumber(emp.monthly_salary);

  return { source: 'manual', basic: round2(basic), allowances: [] };
}

export function computePayrollLine(
  emp: PayrollEmployeeInput,
  deductions: StatutoryDeductionInput[],
  codes: LineCodes = {}
): PayrollLineResult {
  const { source, basic, allowances } = resolveEarnings(emp);
  const allowanceTotal = allowances.reduce((sum, a) => sum + toNumber(a.amount), 0);
  const gross = round2(basic + allowanceTotal);

  const breakdown: DeductionBreakdown[] = deductions
    .filter((d) => d.applies)
    .map((d) => {
      const cap = d.wage_cap == null ? null : toNumber(d.wage_cap);
      const base = cap != null && cap > 0 ? Math.min(gross, cap) : gross;
      return {
        label: d.label || 'Deduction',
        tax_code: (d.tax_code ?? '').trim(),
        employee_amount: round2((base * toNumber(d.employee_pct)) / 100),
        employer_amount: round2((base * toNumber(d.employer_pct)) / 100),
      };
    });

  const employeeStatutory = round2(breakdown.reduce((s, b) => s + b.employee_amount, 0));
  const employerStatutory = round2(breakdown.reduce((s, b) => s + b.employer_amount, 0));

  const extra = round2(toNumber(emp.extra_deductions));
  const totalDeductions = round2(employeeStatutory + extra);
  const net = round2(gross - totalDeductions);

  const line_items: PayrollLineItem[] = [
    { label: 'Basic salary', tax_code: codes.basic ?? '', amount: basic, kind: 'earning' },
    ...allowances.map<PayrollLineItem>((a) => ({
      label: a.label,
      tax_code: (a.tax_code ?? codes.allowance ?? '') || '',
      amount: a.amount,
      kind: 'earning',
    })),
    { label: 'Gross pay', tax_code: codes.gross ?? '', amount: gross, kind: 'earning' },
    ...breakdown
      .filter((b) => b.employee_amount > 0)
      .map<PayrollLineItem>((b) => ({
        label: b.label,
        tax_code: b.tax_code,
        amount: b.employee_amount,
        kind: 'deduction',
      })),
    ...(extra > 0
      ? [{ label: 'Other deductions', tax_code: '', amount: extra, kind: 'deduction' as const }]
      : []),
    ...breakdown
      .filter((b) => b.employer_amount > 0)
      .map<PayrollLineItem>((b) => ({
        label: `${b.label} (employer)`,
        tax_code: b.tax_code,
        amount: b.employer_amount,
        kind: 'employer',
      })),
  ];

  return {
    employee_id: emp.id,
    employee_name: emp.name,
    source,
    gross,
    employee_statutory: employeeStatutory,
    employer_statutory: employerStatutory,
    deductions: totalDeductions,
    net,
    breakdown,
    line_items,
  };
}

export interface PayrollPreview {
  lines: PayrollLineResult[];
  totals: {
    gross: number;
    employee_statutory: number;
    employer_statutory: number;
    deductions: number;
    net: number;
  };
  /** Per-deduction totals across all employees, keyed by label. */
  byDeduction: DeductionBreakdown[];
  employer_contributions: number;
  total_cost: number;
}

export function computePayrollPreview(
  employees: PayrollEmployeeInput[],
  deductions: StatutoryDeductionInput[],
  codes: LineCodes = {}
): PayrollPreview {
  const lines = employees.map((e) => computePayrollLine(e, deductions, codes));
  const sum = (pick: (l: PayrollLineResult) => number) =>
    round2(lines.reduce((acc, l) => acc + pick(l), 0));

  const totals = {
    gross: sum((l) => l.gross),
    employee_statutory: sum((l) => l.employee_statutory),
    employer_statutory: sum((l) => l.employer_statutory),
    deductions: sum((l) => l.deductions),
    net: sum((l) => l.net),
  };

  const agg = new Map<string, DeductionBreakdown>();
  lines.forEach((l) =>
    l.breakdown.forEach((b) => {
      const cur = agg.get(b.label) ?? {
        label: b.label,
        tax_code: b.tax_code,
        employee_amount: 0,
        employer_amount: 0,
      };
      cur.employee_amount = round2(cur.employee_amount + b.employee_amount);
      cur.employer_amount = round2(cur.employer_amount + b.employer_amount);
      agg.set(b.label, cur);
    })
  );

  const employer_contributions = totals.employer_statutory;
  const total_cost = round2(totals.gross + employer_contributions);

  return {
    lines,
    totals,
    byDeduction: Array.from(agg.values()),
    employer_contributions,
    total_cost,
  };
}
