/**
 * Country presets for Books.
 *
 * ONLY ONE built-in preset exists: South Africa. Every other country starts
 * with an EMPTY statutory deduction list that the business fills in itself.
 * Nothing here is tax advice — the rates are editable starting points.
 */
import type { StatutoryDeductionInput } from './payroll';

export interface CountryPreset {
  country: string;
  currency: string;
  deductions: StatutoryDeductionInput[];
  /** Free-text codes prefilled on payroll line items for this country. */
  lineCodes: {
    basic: string;
    allowance: string;
    travel_allowance: string;
    gross: string;
  };
}

export const SOUTH_AFRICA_PRESET: CountryPreset = {
  country: 'South Africa',
  currency: 'ZAR',
  deductions: [
    { label: 'PAYE', employee_pct: 18, employer_pct: 0, wage_cap: null, applies: true, tax_code: '4102', sort_order: 0 },
    { label: 'UIF', employee_pct: 1, employer_pct: 1, wage_cap: 17712, applies: true, tax_code: '4141', sort_order: 1 },
    { label: 'SDL', employee_pct: 0, employer_pct: 1, wage_cap: null, applies: true, tax_code: '4142', sort_order: 2 },
  ],
  lineCodes: {
    basic: '3601',
    allowance: '3605',
    travel_allowance: '3701',
    gross: '3699',
  },
};

/** Additional SARS codes kept available for South African businesses. */
export const SOUTH_AFRICA_EXTRA_CODES = ['3606', '4001'];

export const COUNTRY_PRESETS: Record<string, CountryPreset> = {
  'South Africa': SOUTH_AFRICA_PRESET,
};

export function presetFor(country: string | null | undefined): CountryPreset | null {
  if (!country) return null;
  return COUNTRY_PRESETS[country.trim()] ?? null;
}

/** A convenience list — the business may type any country name. */
export const COMMON_COUNTRIES = [
  'South Africa', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'New Zealand', 'Ireland', 'Nigeria', 'Kenya', 'Ghana', 'Namibia', 'Botswana',
  'Zimbabwe', 'Germany', 'France', 'Netherlands', 'Spain', 'Portugal',
  'India', 'Brazil', 'Mexico', 'Philippines', 'Singapore', 'United Arab Emirates',
];
