/**
 * Books money formatting — currency comes from the business, never hardcoded.
 * Every Books figure renders in the currency the business selected on its
 * profile (companies.currency).
 */

export const DEFAULT_BOOKS_CURRENCY = 'USD';

const cache = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  const code = (currency || DEFAULT_BOOKS_CURRENCY).toUpperCase();
  let f = cache.get(code);
  if (!f) {
    try {
      f = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      f = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    cache.set(code, f);
  }
  return f;
}

export function formatMoney(
  value: number | string | null | undefined,
  currency: string = DEFAULT_BOOKS_CURRENCY
): string {
  const n = typeof value === 'string' ? Number(value) : value ?? 0;
  return formatter(currency).format(Number.isFinite(n as number) ? (n as number) : 0);
}

/** Short currency symbol/prefix for compact axis ticks. */
export function currencySymbol(currency: string = DEFAULT_BOOKS_CURRENCY): string {
  try {
    const parts = formatter(currency).formatToParts(1);
    return parts.find((p) => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

export function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
