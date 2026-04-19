// Lightweight global currency utility for Sow2Grow tribal members worldwide.
// USDC remains the platform's settlement currency, but members see prices in their local currency.

export type CurrencyCode =
  | 'USD' | 'USDC' | 'EUR' | 'GBP' | 'ZAR' | 'NGN' | 'KES' | 'GHS'
  | 'INR' | 'BRL' | 'MXN' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'AED'
  | 'SAR' | 'EGP' | 'TZS' | 'UGX' | 'ZMW' | 'BWP' | 'XOF' | 'XAF';

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; symbol: string; name: string; flag?: string }[] = [
  { code: 'USDC', symbol: 'USDC', name: 'USD Coin', flag: '🌐' },
  { code: 'USD',  symbol: '$',    name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR',  symbol: '€',    name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP',  symbol: '£',    name: 'British Pound', flag: '🇬🇧' },
  { code: 'ZAR',  symbol: 'R',    name: 'South African Rand', flag: '🇿🇦' },
  { code: 'NGN',  symbol: '₦',    name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'KES',  symbol: 'KSh',  name: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'GHS',  symbol: 'GH₵',  name: 'Ghanaian Cedi', flag: '🇬🇭' },
  { code: 'EGP',  symbol: 'E£',   name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'TZS',  symbol: 'TSh',  name: 'Tanzanian Shilling', flag: '🇹🇿' },
  { code: 'UGX',  symbol: 'USh',  name: 'Ugandan Shilling', flag: '🇺🇬' },
  { code: 'ZMW',  symbol: 'K',    name: 'Zambian Kwacha', flag: '🇿🇲' },
  { code: 'BWP',  symbol: 'P',    name: 'Botswana Pula', flag: '🇧🇼' },
  { code: 'XOF',  symbol: 'CFA',  name: 'West African CFA', flag: '🌍' },
  { code: 'XAF',  symbol: 'FCFA', name: 'Central African CFA', flag: '🌍' },
  { code: 'INR',  symbol: '₹',    name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'BRL',  symbol: 'R$',   name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN',  symbol: 'Mex$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'CAD',  symbol: 'C$',   name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD',  symbol: 'A$',   name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'JPY',  symbol: '¥',    name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY',  symbol: '¥',    name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'AED',  symbol: 'د.إ',  name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR',  symbol: '﷼',    name: 'Saudi Riyal', flag: '🇸🇦' },
];

// Static fallback rates (1 USDC ≈ X local). Refreshed periodically by an edge function.
// These are display-only approximations; on-chain settlement always uses USDC.
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USDC: 1,    USD: 1,     EUR: 0.92,  GBP: 0.79,  ZAR: 18.5,
  NGN: 1550,  KES: 129,   GHS: 14.5,  EGP: 49,    TZS: 2630,
  UGX: 3700,  ZMW: 26,    BWP: 13.5,  XOF: 605,   XAF: 605,
  INR: 83.5,  BRL: 5.4,   MXN: 19.5,  CAD: 1.36,  AUD: 1.52,
  JPY: 156,   CNY: 7.25,  AED: 3.67,  SAR: 3.75,
};

export function convertFromUSDC(amountUSDC: number, target: CurrencyCode): number {
  const rate = FALLBACK_RATES[target] ?? 1;
  return amountUSDC * rate;
}

export function convertToUSDC(amountLocal: number, source: CurrencyCode): number {
  const rate = FALLBACK_RATES[source] ?? 1;
  return rate === 0 ? amountLocal : amountLocal / rate;
}

export function formatLocalAmount(amountUSDC: number, target: CurrencyCode = 'USDC'): string {
  const meta = SUPPORTED_CURRENCIES.find(c => c.code === target);
  const symbol = meta?.symbol ?? target;
  const local = convertFromUSDC(amountUSDC, target);
  if (target === 'USDC') return `${local.toFixed(2)} USDC`;
  // No decimals for high-denom currencies
  const noDecimals: CurrencyCode[] = ['JPY', 'NGN', 'KES', 'TZS', 'UGX', 'XOF', 'XAF'];
  const formatted = noDecimals.includes(target)
    ? Math.round(local).toLocaleString()
    : local.toFixed(2);
  return `${symbol}${formatted}`;
}

export function detectCurrencyFromCountry(country?: string | null): CurrencyCode {
  if (!country) return 'USDC';
  const map: Record<string, CurrencyCode> = {
    'south africa': 'ZAR', 'nigeria': 'NGN', 'kenya': 'KES', 'ghana': 'GHS',
    'egypt': 'EGP', 'tanzania': 'TZS', 'uganda': 'UGX', 'zambia': 'ZMW',
    'botswana': 'BWP', 'india': 'INR', 'brazil': 'BRL', 'mexico': 'MXN',
    'canada': 'CAD', 'australia': 'AUD', 'japan': 'JPY', 'china': 'CNY',
    'uae': 'AED', 'united arab emirates': 'AED', 'saudi arabia': 'SAR',
    'united states': 'USD', 'usa': 'USD', 'united kingdom': 'GBP', 'uk': 'GBP',
  };
  return map[country.toLowerCase()] ?? 'USDC';
}
