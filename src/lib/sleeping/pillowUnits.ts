import { supabase } from '@/integrations/supabase/client';

/**
 * A Sleeping Pillow listing holds one or more units.
 *
 * A spare room is a listing with exactly one unit. A resort is a listing with
 * several. The host is never asked to declare "what kind of place are you"
 * before they can start: the form opens with one unit ready to fill in.
 *
 * Rates and capacity live here and nowhere else. The columns of the same name
 * on pillow_seed_details are the pre-units shape and are being removed; two
 * places holding a price is the failure this model exists to end.
 */
export const PILLOW_UNIT_TYPES = [
  { value: 'room',          label: 'Room',          hint: 'A room in a larger place.' },
  { value: 'chalet',        label: 'Chalet',        hint: 'A self-contained chalet.' },
  { value: 'geodesic_dome', label: 'Geodesic dome', hint: 'A dome.' },
  { value: 'tent',          label: 'Tent',          hint: 'A pitched tent.' },
  { value: 'safari_tent',   label: 'Safari tent',   hint: 'A furnished canvas tent.' },
  { value: 'cabin',         label: 'Cabin',         hint: 'A cabin or hut.' },
  { value: 'cottage',       label: 'Cottage',       hint: 'A whole cottage or house.' },
  { value: 'apartment',     label: 'Apartment',     hint: 'A flat or apartment.' },
  { value: 'other',         label: 'Something else', hint: 'Anything the list does not cover.' },
] as const;

export type PillowUnitType = typeof PILLOW_UNIT_TYPES[number]['value'];

export const UNIT_RATE_PERIODS = [
  { column: 'rate_nightly', label: 'Per night', short: 'night' },
  { column: 'rate_weekly',  label: 'Per week',  short: 'week' },
  { column: 'rate_monthly', label: 'Per month', short: 'month' },
] as const;

export interface PillowUnit {
  id?: string;
  product_id?: string;
  unit_type: PillowUnitType;
  name: string;
  sleeps: number;
  rate_nightly: number | null;
  rate_weekly: number | null;
  rate_monthly: number | null;
  sort_order: number;
}

export function unitTypeLabel(value: string | null | undefined): string {
  return PILLOW_UNIT_TYPES.find((t) => t.value === value)?.label ?? 'Unit';
}

/** The rates a unit actually has, in the order a person reads them. */
export function ratesOnUnit(u: Partial<PillowUnit>): Array<{ label: string; short: string; amount: number }> {
  return UNIT_RATE_PERIODS
    .map((p) => ({ label: p.label, short: p.short, amount: Number(u[p.column]) }))
    .filter((r) => Number.isFinite(r.amount) && r.amount > 0);
}

/**
 * The number a card shows as "from". The cheapest rate a guest could pay for
 * any unit, whichever period it happens to be quoted in.
 */
export function fromRate(units: Array<Partial<PillowUnit>>): number | null {
  const all = units
    .map((u) => ratesOnUnit(u)[0]?.amount)
    .filter((n): n is number => Number.isFinite(n) && n > 0);
  return all.length ? Math.min(...all) : null;
}

/** The largest party any one unit can take. The sleeps filter matches this. */
export function maxSleeps(units: Array<Partial<PillowUnit>>): number | null {
  const all = units.map((u) => Number(u.sleeps)).filter((n) => Number.isFinite(n) && n > 0);
  return all.length ? Math.max(...all) : null;
}

/** A blank unit for a form that must always show at least one. */
export function blankUnit(sortOrder = 0): PillowUnit {
  return {
    unit_type: 'room',
    name: '',
    sleeps: 2,
    rate_nightly: null,
    rate_weekly: null,
    rate_monthly: null,
    sort_order: sortOrder,
  };
}

/**
 * Whether pillow_units exists yet.
 *
 * The migration is applied by hand and can land before or after this code
 * deploys. Writing to a table PostgREST does not know about fails the whole
 * save, so the form asks once and falls back to the single-unit shape until
 * the table is there. Costs one tiny query and needs no second deploy.
 */
let cached: Promise<boolean> | null = null;

export function pillowUnitsAvailable(): Promise<boolean> {
  if (!cached) {
    cached = Promise.resolve(supabase
      .from('pillow_units')
      .select('id')
      .limit(1)
      .then(({ error }) => !error)
      .then(undefined, () => false));
  }
  return cached;
}

/** Every unit of a listing, in the host's own order. */
export async function loadUnits(productId: string): Promise<PillowUnit[]> {
  if (!(await pillowUnitsAvailable())) return [];
  const { data, error } = await supabase
    .from('pillow_units')
    .select('id, product_id, unit_type, name, sleeps, rate_nightly, rate_weekly, rate_monthly, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return (data ?? []) as unknown as PillowUnit[];
}
