/**
 * The Sleeping Hands vocabulary, shared by the registration form, the hub
 * filters and the detail page. These values match the database enum in
 * supabase/migrations/20260916230000_hand_seed_details.sql exactly.
 *
 * Deliberately the same shape as wheelOptions.ts and pillowOptions.ts. One
 * pattern, not three.
 */

export const PROFESSIONAL_CATEGORIES = [
  { value: 'plumber',            label: 'Plumber' },
  { value: 'electrician',        label: 'Electrician' },
  { value: 'mechanic',           label: 'Mechanic' },
  { value: 'builder',            label: 'Builder' },
  { value: 'painter',            label: 'Painter' },
  { value: 'security',           label: 'Security' },
  { value: 'it_digital',         label: 'IT & digital' },
  { value: 'accounting',         label: 'Accounting' },
  { value: 'tutoring',           label: 'Tutoring' },
  { value: 'health_care',        label: 'Health care' },
  { value: 'other_professional', label: 'Another trade' },
] as const;

export const HOUSEHOLD_CATEGORIES = [
  { value: 'domestic_work',     label: 'Domestic work' },
  { value: 'au_pair_childcare', label: 'Au pair or childcare' },
  { value: 'house_sitting',     label: 'House sitting' },
  { value: 'pet_sitting',       label: 'Pet sitting' },
  { value: 'gardening',         label: 'Gardening' },
  { value: 'cleaning',          label: 'Cleaning' },
  { value: 'elder_care',        label: 'Elder care' },
  { value: 'driver',            label: 'Driver' },
  { value: 'other_household',   label: 'Something else at home' },
] as const;

export const SERVICE_CATEGORIES = [
  ...PROFESSIONAL_CATEGORIES.map((c) => ({ ...c, professional: true as const })),
  ...HOUSEHOLD_CATEGORIES.map((c) => ({ ...c, professional: false as const })),
];

export type ServiceCategory = typeof SERVICE_CATEGORIES[number]['value'];

const PROFESSIONAL_SET = new Set<string>(PROFESSIONAL_CATEGORIES.map((c) => c.value));

/** The single source of truth the form and the database agree on. */
export function isProfessionalCategory(value: string | null | undefined): boolean {
  return !!value && PROFESSIONAL_SET.has(value);
}

export function serviceCategoryLabel(value: string | null | undefined): string {
  return SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? 'Service';
}

/**
 * Rate periods. `column` is the database column; `filterValue` is what
 * sleeping_hands_near() expects in its _rate_periods argument.
 */
export const HAND_RATE_PERIODS = [
  { column: 'rate_hourly',  filterValue: 'hourly',  label: 'Per hour',  short: 'hour' },
  { column: 'rate_per_job', filterValue: 'per_job', label: 'Per job',   short: 'job' },
  { column: 'rate_daily',   filterValue: 'daily',   label: 'Per day',   short: 'day' },
  { column: 'rate_weekly',  filterValue: 'weekly',  label: 'Per week',  short: 'week' },
  { column: 'rate_monthly', filterValue: 'monthly', label: 'Per month', short: 'month' },
] as const;

/** A short, non-exhaustive starter list. The field stays free-text too. */
export const COMMON_LANGUAGES = [
  'English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'Sesotho', 'Setswana',
  'Portuguese', 'French', 'Spanish', 'Shona',
] as const;

/**
 * The qualification field changes meaning with the group, so it changes
 * label too. Professionals are asked for a credential and must give one.
 * Household listers are asked for context and may leave it blank.
 */
export const QUALIFICATION_LABEL = {
  professional: 'Your trade qualification or licence',
  household: "Anything you'd like people to know about your experience",
} as const;

/** Jurisdiction-neutral by design: it names no country's permit types. */
export const HAND_LEGAL_CONFIRMATION =
  'I confirm I hold the licences, registrations and permits legally required '
  + 'to offer this service for payment, and that insurance and liability for '
  + 'the work I do are mine.';

/** Shown above the references section, before any referee detail is typed. */
export const REFERENCE_CONSENT_NOTE =
  'Ask your referee first. Only enter someone’s details once they have said '
  + 'yes to being contacted about your work.';

/** What a browsing member is told about the background-check claim. */
export const BACKGROUND_CHECK_DISCLAIMER =
  'This is what the lister says about themselves. Sow2Grow has not checked it.';

export const HAND_PRIMARY_RATE_ORDER = [
  'rate_hourly', 'rate_per_job', 'rate_daily', 'rate_weekly', 'rate_monthly',
] as const;

export const HAND_LEGACY_RATE_UNIT: Record<string, string> = {
  rate_hourly: 'per_hour',
  rate_per_job: 'per_job',
  rate_daily: 'per_day',
  rate_weekly: 'per_week',
  rate_monthly: 'per_month',
};

/** The rates a listing actually has, in the order a person reads them. */
export function handRatesOn(row: Record<string, unknown>): Array<{ label: string; short: string; amount: number }> {
  return HAND_RATE_PERIODS
    .map((p) => ({ label: p.label, short: p.short, amount: Number(row[p.column]) }))
    .filter((r) => Number.isFinite(r.amount) && r.amount > 0);
}
