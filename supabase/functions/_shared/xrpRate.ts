// Live XRP/USD price for the XRP rail.
//
// GOLDEN RULE: USD is the unit of account everywhere in Sow2Grow. XRP is only a
// transport rail. Nobody's balance is ever denominated in XRP — we convert at a
// quoted rate on the way in, and at the send-time rate on the way out, and the
// ledger only ever records USD.
//
// Reliability strategy: we poll several independent, high-liquidity spot
// sources and take the MEDIAN. A single exchange can wick, stall, or return a
// stale cached tick; a median across three venues cannot be moved by one bad
// feed. If fewer than two sources answer, we refuse to quote rather than guess
// at real money.
//
// Optional override (testing / dry runs only):
//   XRP_USD_RATE   fixed rate; bypasses the live feeds entirely.

export interface XrpRateQuote {
  /** USD per 1 XRP. */
  rate: number;
  /** Which venues actually answered, with their individual prices. */
  sources: { name: string; price: number }[];
  /** ISO timestamp the rate was observed. */
  observedAt: string;
  /** True when XRP_USD_RATE was used instead of live feeds. */
  isOverride: boolean;
}

/** Refuse any rate older than this — a stale price is a wrong price. */
export const RATE_STALENESS_MS = 60_000;

/** How long a checkout quote stays honoured before the bestower must re-quote. */
export const QUOTE_TTL_MS = 10 * 60_000;

/** Reject the median if two venues disagree by more than this — feeds are broken. */
const MAX_SPREAD_RATIO = 0.05; // 5%

interface Venue {
  name: string;
  url: string;
  pick: (json: any) => unknown;
}

const VENUES: Venue[] = [
  {
    name: "coinbase",
    url: "https://api.coinbase.com/v2/prices/XRP-USD/spot",
    pick: (j) => j?.data?.amount,
  },
  {
    name: "kraken",
    url: "https://api.kraken.com/0/public/Ticker?pair=XRPUSD",
    pick: (j) => {
      const result = j?.result ?? {};
      const first = Object.values(result)[0] as any;
      return first?.c?.[0];
    },
  },
  {
    name: "bitstamp",
    url: "https://www.bitstamp.net/api/v2/ticker/xrpusd/",
    pick: (j) => j?.last,
  },
];

let cached: XrpRateQuote | null = null;

async function fetchVenue(venue: Venue): Promise<{ name: string; price: number } | null> {
  try {
    const res = await fetch(venue.url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const price = Number(venue.pick(await res.json()));
    if (!Number.isFinite(price) || price <= 0) return null;
    return { name: venue.name, price };
  } catch {
    return null;
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Current USD price of 1 XRP. Throws if no trustworthy price can be established
 * — callers must let that surface rather than fall back to a guessed number.
 */
export async function getXrpUsdRate(): Promise<XrpRateQuote> {
  const override = Number(Deno.env.get("XRP_USD_RATE") ?? "");
  if (Number.isFinite(override) && override > 0) {
    return {
      rate: override,
      sources: [{ name: "XRP_USD_RATE override", price: override }],
      observedAt: new Date().toISOString(),
      isOverride: true,
    };
  }

  if (cached && Date.now() - Date.parse(cached.observedAt) < 15_000) return cached;

  const results = (await Promise.all(VENUES.map(fetchVenue))).filter(
    (r): r is { name: string; price: number } => r !== null,
  );

  if (results.length < 2) {
    throw new Error(
      "Could not establish a reliable XRP/USD price right now (needs at least 2 independent sources). Please try again in a moment.",
    );
  }

  const prices = results.map((r) => r.price);
  const spread = (Math.max(...prices) - Math.min(...prices)) / Math.min(...prices);
  if (spread > MAX_SPREAD_RATIO) {
    throw new Error(
      `XRP price sources disagree by ${(spread * 100).toFixed(1)}% — refusing to quote until they agree.`,
    );
  }

  cached = {
    rate: median(prices),
    sources: results,
    observedAt: new Date().toISOString(),
    isOverride: false,
  };
  return cached;
}

/** USD -> XRP, rounded to 6 decimals (XRP ledger precision is 6). */
export function usdToXrp(usd: number, rate: number): number {
  return Math.round((usd / rate) * 1e6) / 1e6;
}

/** XRP -> USD, rounded to cents. */
export function xrpToUsd(xrp: number, rate: number): number {
  return Math.round(xrp * rate * 100) / 100;
}

/** Throws when a stored rate is too old to act on. */
export function assertRateFresh(observedAt: string) {
  if (Date.now() - Date.parse(observedAt) > RATE_STALENESS_MS) {
    throw new Error("XRP price is stale — refusing to send at an out-of-date rate.");
  }
}
