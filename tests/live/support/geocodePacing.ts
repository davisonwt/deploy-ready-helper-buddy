/**
 * Keeps a live test run inside geocode-place's rate limit.
 *
 * supabase/functions/geocode-place/index.ts allows **20 requests per 5
 * minutes** per caller, and checks the limit BEFORE its cache, on purpose:
 * "a cache hit still passes through this check... it keeps a scripted caller
 * from walking the cache". So re-asking for the same town costs a token.
 *
 * A full sleeping-pillows run makes about 19 calls: one per registration and
 * one per hub place lookup. That is under the limit on its own, which is why
 * the suite usually passed, and over it the moment two runs land in the same
 * five-minute window. When the limit is hit the function returns 503, the
 * form correctly stores NO coordinates rather than a wrong fallback, and the
 * listing correctly does not appear in the hub. The test then fails for a
 * reason that is not a defect.
 *
 * This mirrors the server's budget as a token bucket: 20 tokens, refilling at
 * one per 15 seconds. Calling `paceGeocode()` before anything that triggers a
 * lookup waits only when the budget is actually spent, so a short run is not
 * slowed at all and a long one slows to the rate the server allows.
 */

const MAX_TOKENS = 20;
/** 20 per 5 minutes is one per 15 seconds sustained. */
const REFILL_MS = 15_000;
/** A little headroom, since the server's window and ours are not aligned. */
const SAFETY_MS = 1_000;

let tokens = MAX_TOKENS;
let lastRefill = Date.now();

function refill(): void {
  const now = Date.now();
  const gained = Math.floor((now - lastRefill) / REFILL_MS);
  if (gained > 0) {
    tokens = Math.min(MAX_TOKENS, tokens + gained);
    lastRefill += gained * REFILL_MS;
  }
}

/**
 * Spend one geocode token, waiting for one to be available.
 * Call it immediately before submitting a form or setting a hub location.
 */
export async function paceGeocode(label = 'geocode'): Promise<void> {
  refill();
  if (tokens > 0) {
    tokens -= 1;
    return;
  }
  const waitMs = REFILL_MS - (Date.now() - lastRefill) + SAFETY_MS;
  // eslint-disable-next-line no-console
  console.log(`[pace] ${label}: geocode budget spent, waiting ${Math.round(waitMs / 1000)}s`);
  await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, SAFETY_MS)));
  refill();
  tokens = Math.max(0, tokens - 1);
}

/**
 * Assume the budget is already partly spent by an earlier spec in the same
 * worker or an earlier run in the same window. Start pessimistic rather than
 * discovering it through a failure.
 */
export function assumeGeocodeBudgetSpent(spent = MAX_TOKENS): void {
  tokens = Math.max(0, MAX_TOKENS - spent);
  lastRefill = Date.now();
}
