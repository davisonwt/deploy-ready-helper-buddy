/** Books uses ZAR (South African Rand) for every monetary figure. */
export const BOOKS_CURRENCY = 'ZAR';

const zar = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatZAR(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value ?? 0;
  return zar.format(Number.isFinite(n as number) ? (n as number) : 0);
}

export function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
}
