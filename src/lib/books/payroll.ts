/**
 * South African payroll maths — SIMPLIFIED, ILLUSTRATIVE ONLY.
 *
 * PAYE here is a flat editable percentage, NOT the SARS sliding scale.
 * UIF = 1% employee + 1% employer, each capped at the UIF remuneration ceiling.
 * SDL = 1% of leviable payroll, employer only, when the business is liable.
 *
 * Every figure must be verified against current SARS guidance or a registered
 * tax practitioner before it is used for real filings.
 */
import { toNumber } from './format';

/** SARS source codes used on the IRP5/EMP201 breakdown. */
export const SARS_CODES = {
  BASIC_SALARY: '3601',
  TRAVEL_ALLOWANCE: '3701',
  OTHER_ALLOWANCE: '3713',
  GROSS_REMUNERATION: '3699',
  PAYE: '4102',
  UIF: '4141',
  SDL: '4142',
  OTHER_DEDUCTION: '4149',
} as const;

export const UIF_EMPLOYEE_PCT = 1;
export const UIF_EMPLOYER_PCT = 1;
export const SDL_PCT = 1;

export interface TaxSettings {
  paye_pct: number;
  uif_ceiling: number;
  sdl_applies: boolean;
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  paye_pct: 18,
  uif_ceiling: 17712,
  sdl_applies: true,
};

export interface ContractAllowance {
  label: string;
  amount: number;
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
  sars_code: string;
  amount: number;
  kind: 'earning' | 'deduction' | 'employer';
}

export interface PayrollLineResult {
  employee_id: string;
  employee_name: string;
  source: 'contract' | 'manual';
  gross: number;
  paye: number;
  uif_employee: number;
  uif_employer: number;
  sdl: number;
  deductions: number;
  net: number;
  line_items: PayrollLineItem[];
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
        sars_code: a.sars_code || SARS_CODES.OTHER_ALLOWANCE,
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
  settings: TaxSettings
): PayrollLineResult {
  const { source, basic, allowances } = resolveEarnings(emp);
  const allowanceTotal = allowances.reduce((sum, a) => sum + toNumber(a.amount), 0);
  const gross = round2(basic + allowanceTotal);

  const paye = round2((gross * toNumber(settings.paye_pct)) / 100);

  const uifBase = Math.min(gross, toNumber(settings.uif_ceiling));
  const uifEmployee = round2((uifBase * UIF_EMPLOYEE_PCT) / 100);
  const uifEmployer = round2((uifBase * UIF_EMPLOYER_PCT) / 100);
  const sdl = settings.sdl_applies ? round2((gross * SDL_PCT) / 100) : 0;

  const extra = round2(toNumber(emp.extra_deductions));
  const deductions = round2(paye + uifEmployee + extra);
  const net = round2(gross - deductions);

  const line_items: PayrollLineItem[] = [
    { label: 'Basic salary', sars_code: SARS_CODES.BASIC_SALARY, amount: basic, kind: 'earning' },
    ...allowances.map<PayrollLineItem>((a) => ({
      label: a.label,
      sars_code: a.sars_code || SARS_CODES.OTHER_ALLOWANCE,
      amount: a.amount,
      kind: 'earning',
    })),
    { label: 'Gross remuneration', sars_code: SARS_CODES.GROSS_REMUNERATION, amount: gross, kind: 'earning' },
    { label: 'PAYE', sars_code: SARS_CODES.PAYE, amount: paye, kind: 'deduction' },
    { label: 'UIF (employee 1%)', sars_code: SARS_CODES.UIF, amount: uifEmployee, kind: 'deduction' },
    ...(extra > 0
      ? [{ label: 'Other deductions', sars_code: SARS_CODES.OTHER_DEDUCTION, amount: extra, kind: 'deduction' as const }]
      : []),
    { label: 'UIF (employer 1%)', sars_code: SARS_CODES.UIF, amount: uifEmployer, kind: 'employer' },
    ...(sdl > 0
      ? [{ label: 'SDL (employer 1%)', sars_code: SARS_CODES.SDL, amount: sdl, kind: 'employer' as const }]
      : []),
  ];

  return {
    employee_id: emp.id,
    employee_name: emp.name,
    source,
    gross,
    paye,
    uif_employee: uifEmployee,
    uif_employer: uifEmployer,
    sdl,
    deductions,
    net,
    line_items,
  };
}

export interface PayrollPreview {
  lines: PayrollLineResult[];
  totals: {
    gross: number;
    paye: number;
    uif_employee: number;
    uif_employer: number;
    sdl: number;
    deductions: number;
    net: number;
  };
  employer_contributions: number;
  total_cost: number;
}

export function computePayrollPreview(
  employees: PayrollEmployeeInput[],
  settings: TaxSettings
): PayrollPreview {
  const lines = employees.map((e) => computePayrollLine(e, settings));
  const sum = (pick: (l: PayrollLineResult) => number) =>
    round2(lines.reduce((acc, l) => acc + pick(l), 0));

  const totals = {
    gross: sum((l) => l.gross),
    paye: sum((l) => l.paye),
    uif_employee: sum((l) => l.uif_employee),
    uif_employer: sum((l) => l.uif_employer),
    sdl: sum((l) => l.sdl),
    deductions: sum((l) => l.deductions),
    net: sum((l) => l.net),
  };

  const employer_contributions = round2(totals.uif_employer + totals.sdl);
  const total_cost = round2(totals.gross + employer_contributions);

  return { lines, totals, employer_contributions, total_cost };
}
