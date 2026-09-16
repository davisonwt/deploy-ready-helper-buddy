/**
 * The Sleeping Pillows vocabulary, shared by the registration form, the hub
 * filters and the detail page. These values match the database enum and the
 * amenities CHECK constraint in
 * supabase/migrations/20260916210000_pillow_seed_details.sql exactly.
 *
 * Deliberately the same shape as wheelOptions.ts. One pattern, not two.
 */

export const STAY_TYPES = [
  { value: 'room_in_home',     label: 'Room in my home',  hint: 'A spare room. You are there too.' },
  { value: 'whole_place',      label: 'The whole place',  hint: 'They get it to themselves.' },
  { value: 'guest_house',      label: 'Guest house',      hint: 'Several rooms you let out.' },
  { value: 'hotel_motel_room', label: 'Hotel or motel',   hint: 'A room in a registered place.' },
  { value: 'farm_stay',        label: 'Farm stay',        hint: 'On a working farm or smallholding.' },
  { value: 'bush_camp',        label: 'Bush camp',        hint: 'Tents, cabins, off the grid.' },
  { value: 'other',            label: 'Something else',   hint: 'Anything the list above does not cover.' },
] as const;

export type StayType = typeof STAY_TYPES[number]['value'];

export const AMENITIES = [
  { value: 'own_bathroom',     label: 'Own bathroom' },
  { value: 'kitchen_access',   label: 'Kitchen access' },
  { value: 'wifi',             label: 'Wifi' },
  { value: 'parking',          label: 'Parking' },
  { value: 'breakfast',        label: 'Breakfast' },
  { value: 'pets_allowed',     label: 'Pets allowed' },
  { value: 'wheelchair_access', label: 'Wheelchair access' },
  { value: 'braai',            label: 'Braai' },
  { value: 'pool',             label: 'Pool' },
] as const;

export type Amenity = typeof AMENITIES[number]['value'];

/**
 * Rate periods. `column` is the database column; `filterValue` is what
 * sleeping_pillows_near() expects in its _rate_periods argument.
 */
export const PILLOW_RATE_PERIODS = [
  { column: 'rate_nightly', filterValue: 'nightly', label: 'Per night', short: 'night' },
  { column: 'rate_weekly',  filterValue: 'weekly',  label: 'Per week',  short: 'week' },
  { column: 'rate_monthly', filterValue: 'monthly', label: 'Per month', short: 'month' },
] as const;

/**
 * The exact wording of the letting confirmation. Jurisdiction-neutral by
 * design: it names no country's permit types, exactly as the Wheels one
 * names no country's vehicle permits.
 */
export const HOST_LEGAL_CONFIRMATION =
  'I confirm I hold the licences and permits legally required to let this '
  + 'place for paid stays, and that insurance and liability for this property '
  + 'and the stays I host are mine.';

/**
 * How the single registration flow branches. One form, not seven. What
 * changes per stay type is which amenities are offered first and which rate
 * periods lead, so someone letting a spare room is not asked about a pool
 * and a month-long farm stay leads with its monthly rate.
 */
export const STAY_BRANCH: Record<StayType, {
  suggestedAmenities: readonly Amenity[];
  suggestedRates: readonly string[];
  sleepsQuestion: string;
}> = {
  room_in_home: {
    suggestedAmenities: ['own_bathroom', 'wifi', 'breakfast', 'parking'],
    suggestedRates: ['rate_nightly', 'rate_weekly'],
    sleepsQuestion: 'How many people can sleep in the room?',
  },
  whole_place: {
    suggestedAmenities: ['kitchen_access', 'wifi', 'parking', 'pets_allowed', 'braai', 'pool'],
    suggestedRates: ['rate_nightly', 'rate_weekly', 'rate_monthly'],
    sleepsQuestion: 'How many people can stay?',
  },
  guest_house: {
    suggestedAmenities: ['own_bathroom', 'breakfast', 'wifi', 'parking', 'pool'],
    suggestedRates: ['rate_nightly', 'rate_weekly'],
    sleepsQuestion: 'How many people can you take at once?',
  },
  hotel_motel_room: {
    suggestedAmenities: ['own_bathroom', 'wifi', 'parking', 'breakfast', 'wheelchair_access'],
    suggestedRates: ['rate_nightly'],
    sleepsQuestion: 'How many people per room?',
  },
  farm_stay: {
    suggestedAmenities: ['kitchen_access', 'parking', 'pets_allowed', 'braai'],
    suggestedRates: ['rate_nightly', 'rate_weekly', 'rate_monthly'],
    sleepsQuestion: 'How many people can stay?',
  },
  bush_camp: {
    suggestedAmenities: ['braai', 'parking', 'pets_allowed'],
    suggestedRates: ['rate_nightly', 'rate_weekly'],
    sleepsQuestion: 'How many people can camp?',
  },
  other: {
    suggestedAmenities: ['wifi', 'parking', 'own_bathroom'],
    suggestedRates: ['rate_nightly', 'rate_weekly', 'rate_monthly'],
    sleepsQuestion: 'How many people can stay?',
  },
};

/**
 * Which rate becomes products.price, so the existing booking and 85/15 split
 * keep working untouched. First one set, in this order.
 */
export const PILLOW_PRIMARY_RATE_ORDER = ['rate_nightly', 'rate_weekly', 'rate_monthly'] as const;

/** The legacy service_details.rate_unit value for a given rate column. */
export const PILLOW_LEGACY_RATE_UNIT: Record<string, string> = {
  rate_nightly: 'per_night',
  rate_weekly: 'per_week',
  rate_monthly: 'per_month',
};

export function stayTypeLabel(value: string | null | undefined): string {
  return STAY_TYPES.find((t) => t.value === value)?.label ?? 'Place to stay';
}

export function labelForAmenity(value: string): string {
  return AMENITIES.find((a) => a.value === value)?.label ?? value;
}

/** The rates a listing actually has, in the order a person reads them. */
export function pillowRatesOn(row: Record<string, unknown>): Array<{ label: string; short: string; amount: number }> {
  return PILLOW_RATE_PERIODS
    .map((p) => ({ label: p.label, short: p.short, amount: Number(row[p.column]) }))
    .filter((r) => Number.isFinite(r.amount) && r.amount > 0);
}
