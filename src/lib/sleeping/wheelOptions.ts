/**
 * The Sleeping Wheels vocabulary, shared by the registration form, the
 * hub filters and the detail page. These values match the database enum
 * and the use_tags CHECK constraint in
 * supabase/migrations/20260916150000_sleeping_wheels.sql exactly.
 *
 * Labels are plain words. A person registering a vehicle on a phone
 * should never have to decode a term.
 */

export const VEHICLE_TYPES = [
  { value: 'sedan',           label: 'Car',              hint: 'A normal car. People and small loads.' },
  { value: 'bakkie',          label: 'Bakkie / pickup',  hint: 'An open load bin behind the cab.' },
  { value: 'truck',           label: 'Truck',            hint: 'A big load. Furniture, pallets, bulk.' },
  { value: 'yellow_machine',  label: 'Yellow machine',   hint: 'Digger, loader, TLB, roller.' },
  { value: 'farming_vehicle', label: 'Farming vehicle',  hint: 'Tractor, harvester, baler.' },
  { value: 'other',           label: 'Something else',   hint: 'Anything the list above does not cover.' },
] as const;

export type VehicleType = typeof VEHICLE_TYPES[number]['value'];

export const USE_TAGS = [
  { value: 'parcels',          label: 'Parcels' },
  { value: 'passengers',       label: 'Passengers' },
  { value: 'deliveries',       label: 'Deliveries' },
  { value: 'sand',             label: 'Sand' },
  { value: 'stone',            label: 'Stone' },
  { value: 'garden_waste',     label: 'Garden waste' },
  { value: 'furniture_moving', label: 'Furniture moving' },
  { value: 'livestock',        label: 'Livestock' },
  { value: 'construction',     label: 'Construction' },
  { value: 'farming',          label: 'Farming' },
  { value: 'other',            label: 'Other' },
] as const;

export type UseTag = typeof USE_TAGS[number]['value'];

/**
 * Rate periods. Short-term and long-term both matter: a bakkie hauling one
 * load of sand is per-trip, a truck hired for a month is monthly.
 *
 * `column` is the database column; `filterValue` is what
 * sleeping_wheels_near() expects in its _rate_periods argument.
 */
export const RATE_PERIODS = [
  { column: 'rate_per_trip', filterValue: 'per_trip', label: 'Per trip',  short: 'trip' },
  { column: 'rate_hourly',   filterValue: 'hourly',   label: 'Per hour',  short: 'hour' },
  { column: 'rate_per_km',   filterValue: 'per_km',   label: 'Per km',    short: 'km' },
  { column: 'rate_daily',    filterValue: 'daily',    label: 'Per day',   short: 'day' },
  { column: 'rate_weekly',   filterValue: 'weekly',   label: 'Per week',  short: 'week' },
  { column: 'rate_monthly',  filterValue: 'monthly',  label: 'Per month', short: 'month' },
] as const;

export type RatePeriod = typeof RATE_PERIODS[number];

/** The exact wording of the licensing confirmation. Jurisdiction-neutral by design. */
export const OPERATOR_LICENCE_CONFIRMATION =
  'I confirm I hold the licences and permits legally required to operate this '
  + 'vehicle for paid hire, and that insurance and liability for this vehicle '
  + 'and its operation are mine.';

/**
 * How the single registration flow branches.
 *
 * There is one form, not five. What changes per vehicle type is which
 * uses and which rate periods are offered first, so a person registering
 * a tractor is never asked about passengers and a car owner is never
 * asked about sand. Everything stays reachable under "Show all".
 */
export const VEHICLE_BRANCH: Record<VehicleType, {
  suggestedTags: readonly UseTag[];
  suggestedRates: readonly string[];
  loadQuestion: string;
}> = {
  sedan: {
    suggestedTags: ['passengers', 'parcels', 'deliveries'],
    suggestedRates: ['rate_per_trip', 'rate_hourly', 'rate_per_km'],
    loadQuestion: 'What do you carry?',
  },
  bakkie: {
    suggestedTags: ['furniture_moving', 'garden_waste', 'sand', 'stone', 'deliveries', 'parcels'],
    suggestedRates: ['rate_per_trip', 'rate_daily', 'rate_hourly'],
    loadQuestion: 'What can you load on the back?',
  },
  truck: {
    suggestedTags: ['furniture_moving', 'construction', 'sand', 'stone', 'livestock', 'deliveries'],
    suggestedRates: ['rate_per_trip', 'rate_daily', 'rate_weekly', 'rate_monthly'],
    loadQuestion: 'What can it haul?',
  },
  yellow_machine: {
    suggestedTags: ['construction', 'sand', 'stone', 'garden_waste'],
    suggestedRates: ['rate_hourly', 'rate_daily', 'rate_weekly', 'rate_monthly'],
    loadQuestion: 'What work can it do?',
  },
  farming_vehicle: {
    suggestedTags: ['farming', 'livestock', 'construction'],
    suggestedRates: ['rate_daily', 'rate_weekly', 'rate_monthly', 'rate_hourly'],
    loadQuestion: 'What work can it do?',
  },
  other: {
    suggestedTags: ['other', 'deliveries', 'parcels'],
    suggestedRates: ['rate_per_trip', 'rate_hourly', 'rate_daily'],
    loadQuestion: 'What can it do?',
  },
};

/**
 * Which rate becomes products.price, so the existing booking and 85/15
 * split keep working untouched. First one set, in this order.
 */
export const PRIMARY_RATE_ORDER = [
  'rate_per_trip', 'rate_hourly', 'rate_per_km',
  'rate_daily', 'rate_weekly', 'rate_monthly',
] as const;

/** The legacy service_details.rate_unit value for a given rate column. */
export const LEGACY_RATE_UNIT: Record<string, string> = {
  rate_per_trip: 'per_trip',
  rate_hourly: 'per_hour',
  rate_per_km: 'per_km',
  rate_daily: 'per_day',
  rate_weekly: 'per_week',
  rate_monthly: 'per_month',
};

export function vehicleTypeLabel(value: string | null | undefined): string {
  return VEHICLE_TYPES.find((t) => t.value === value)?.label ?? 'Vehicle';
}

export function labelForUseTag(value: string): string {
  return USE_TAGS.find((t) => t.value === value)?.label ?? value;
}

/** The rates a listing actually has, in the order a person reads them. */
export function ratesOn(row: Record<string, unknown>): Array<{ label: string; short: string; amount: number }> {
  return RATE_PERIODS
    .map((p) => ({ label: p.label, short: p.short, amount: Number(row[p.column]) }))
    .filter((r) => Number.isFinite(r.amount) && r.amount > 0);
}
