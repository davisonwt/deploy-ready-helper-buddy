// BOOKKEEPING-PLAN.md phase 3, "honest tiles". The word "revenue" is
// reserved for sums of the revenue ledger (public.revenue_summary()).
// Gross money moved is shown, but called volume. Pure, unit-tested.

export const GROSS_VOLUME_LABEL = 'Gross volume';
export const GROSS_VOLUME_SUB = 'Bestowals + sales paid in the window; mostly other people\'s money';
export const S2G_REVENUE_LABEL = 'S2G revenue';

/** The sub line under the S2G revenue tile. */
export function s2gRevenueSub(thisMonthOperatingNet: number | null | undefined): string {
  if (thisMonthOperatingNet === null || thisMonthOperatingNet === undefined) return 'from the revenue ledger, live';
  const n = Number(thisMonthOperatingNet);
  if (!Number.isFinite(n)) return 'from the revenue ledger, live';
  return `this month $${n.toFixed(2)} · from the revenue ledger, live`;
}

/** Labels no admin tile may use over a gross-volume number. */
export const FORBIDDEN_VOLUME_LABELS = ['Total Revenue', 'Revenue Generated', 'raised through bestowals'];
