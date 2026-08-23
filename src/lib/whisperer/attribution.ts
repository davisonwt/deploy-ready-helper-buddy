/**
 * WHISPERER SALE ATTRIBUTION — Sow2Grow
 * =====================================
 *
 * A seed may have MANY approved whisperers. The whisper share is paid to the
 * ONE whisperer who actually made the sale — not split, not first-come.
 *
 * How the sale is attributed:
 *   1. Each ACTIVE (sower-approved) whisperer gets a personal share link:
 *        https://sow2growapp.com/product/<seed>?w=<whispererId>
 *   2. When a buyer opens that link we remember `w` against that seed here
 *      (last touch wins, 30 days).
 *   3. At checkout the remembered whisperer is sent with the basket item.
 *   4. The server re-checks that the whisperer is ACTIVE on that seed before a
 *      single cent moves (see `resolve_active_whisperer`). A forged or expired
 *      claim simply pays nobody and the share falls back to the sower.
 *
 * PAYMENT TIMING: approval already happened when the sower accepted the
 * whisperer on the seed. The earning is credited the moment the payment
 * completes — the sower never approves a payout again.
 */

export const WHISPER_REF_PARAM = 'w';

const STORAGE_KEY = 's2g.whisperer.attribution.v1';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type Entry = { whispererId: string; at: number };
type Store = Record<string, Entry>;

const LAST_TOUCH = '__last__';

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    const now = Date.now();
    const fresh: Store = {};
    for (const [k, v] of Object.entries(parsed || {})) {
      if (v && typeof v.whispererId === 'string' && now - Number(v.at || 0) < TTL_MS) fresh[k] = v;
    }
    return fresh;
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — attribution is best-effort */
  }
}

/** Remember that `whispererId` sent this buyer to `seedId` (last touch wins). */
export function rememberWhisperer(whispererId: string, seedId?: string | null) {
  if (!whispererId) return;
  const store = read();
  const entry: Entry = { whispererId, at: Date.now() };
  store[LAST_TOUCH] = entry;
  if (seedId) store[seedId] = entry;
  write(store);
}

/** The whisperer credited with a sale of this seed, if any. */
export function getWhispererFor(seedId?: string | null): string | null {
  const store = read();
  if (seedId && store[seedId]) return store[seedId].whispererId;
  return store[LAST_TOUCH]?.whispererId ?? null;
}

/** Clear attribution (e.g. after a completed order). */
export function clearWhispererAttribution() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Capture `?w=` from the current URL. `seedId` scopes the credit to one seed
 * when the current page is a seed page.
 */
export function captureWhispererRefFromUrl(search: string, seedId?: string | null) {
  try {
    const params = new URLSearchParams(search);
    const w = params.get(WHISPER_REF_PARAM);
    if (w) rememberWhisperer(w, seedId ?? null);
    return w;
  } catch {
    return null;
  }
}

/** Build a whisperer's personal share link for a seed. */
export function buildWhispererShareLink(path: string, whispererId: string) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://sow2growapp.com';
  const url = new URL(path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`);
  url.searchParams.set(WHISPER_REF_PARAM, whispererId);
  return url.toString();
}
