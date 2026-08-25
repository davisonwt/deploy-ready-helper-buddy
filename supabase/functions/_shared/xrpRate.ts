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

/**
 * Sanity envelope for USD per 1 XRP. Not a prediction — just a tripwire against
 * a feed returning a unit-confused or corrupted number (drops instead of XRP,
 * a cents value, a sentinel). XRP has never traded outside this range and if it
 * ever does, a human should widen this deliberately rather than have an
 * automated payout run act on it.
 */
export const XRP_USD_MIN_PLAUSIBLE = 0.01;
export const XRP_USD_MAX_PLAUSIBLE = 100;

/** True when a rate is a finite number inside the sanity envelope. */
export function isPlausibleXrpRate(rate: unknown): boolean {
  const n = Number(rate);
  return (
    Number.isFinite(n) && n >= XRP_USD_MIN_PLAUSIBLE && n <= XRP_USD_MAX_PLAUSIBLE
  );
}


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
    // Implausible price = broken feed. Drop the venue rather than let it drag
    // the median; if too many drop out we refuse to quote at all.
    if (!isPlausibleXrpRate(price)) return null;
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
 *
 * XRP_USD_RATE is honoured ONLY off mainnet. On mainnet real money moves, and a
 * hardcoded rate is a guess by definition, so the override is ignored there.
 */
export async function getXrpUsdRate(): Promise<XrpRateQuote> {
  const override = Number(Deno.env.get("XRP_USD_RATE") ?? "");
  const isMainnet = (Deno.env.get("XRP_NETWORK") ?? "testnet").toLowerCase() === "mainnet";
  if (Number.isFinite(override) && override > 0) {
    if (isMainnet) {
      console.warn(
        "XRP_USD_RATE is set but IGNORED on mainnet — live price feeds are the only accepted source when real funds move.",
      );
    } else {
      return {
        rate: override,
        sources: [{ name: "XRP_USD_RATE override", price: override }],
        observedAt: new Date().toISOString(),
        isOverride: true,
      };
    }
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

  const rate = median(prices);
  if (!isPlausibleXrpRate(rate)) {
    throw new Error(
      `Median XRP/USD price ${rate} is outside the plausible range ${XRP_USD_MIN_PLAUSIBLE}–${XRP_USD_MAX_PLAUSIBLE} — refusing to act on it.`,
    );
  }

  cached = {
    rate,
    sources: results,
    observedAt: new Date().toISOString(),
    isOverride: false,
  };
  return cached;
}

/**
 * Validate a rate handed over from another function (a run-level rate fetched
 * once by a payout sweep). Throws unless it is plausible AND fresh, so a
 * caller can never talk a sender into using a stale or absurd number.
 */
export function assertUsableXrpRate(rate: unknown, observedAt: unknown): {
  rate: number;
  observedAt: string;
} {
  const n = Number(rate);
  if (!isPlausibleXrpRate(n)) {
    throw new Error(
      `Supplied XRP/USD rate ${rate} is outside the plausible range ${XRP_USD_MIN_PLAUSIBLE}–${XRP_USD_MAX_PLAUSIBLE}.`,
    );
  }
  const iso = typeof observedAt === "string" ? observedAt : "";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) throw new Error("Supplied XRP/USD rate has no valid observed_at timestamp.");
  assertRateFresh(iso);
  return { rate: n, observedAt: iso };
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
