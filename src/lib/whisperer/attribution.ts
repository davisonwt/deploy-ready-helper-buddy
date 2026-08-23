/**
 * WHISPERER SALE ATTRIBUTION — Sow2Grow
 * =====================================
 *
 * A seed may have MANY approved whisperers. The whisper share is paid to the
 * ONE whisperer who actually made the sale — not split, not first-come.
 *
 * ATTRIBUTION IS CODE-BASED. Every ACTIVE (sower-approved) assignment can mint
 * a referral link row (`whisperer_referral_links`) with a short `ref_code`:
 *
 *   evergreen link : https://sow2growapp.com/product/<seed>?w=<REF_CODE>
 *   live link      : same code family, but minted per live session so the sale
 *                    can be traced back to that broadcast
 *
 * FLOW
 *   1. Whisperer mints a code (`ensure_whisperer_ref_link`) — evergreen or for
 *      the live session they are starting.
 *   2. A buyer opens the link -> the click is logged (`log_whisperer_click`)
 *      and the code is remembered here against that seed (30 days, last touch).
 *   3. At checkout the remembered code is sent with the basket item.
 *   4. The server re-validates the code (`resolve_whisperer_by_ref_code`)
 *      before a single cent moves. Precedence:
 *        ref_code click > in-session participation > remembered last touch
 *        > nobody (share falls back to the sower).
 *   5. `whisperer_conversions.attribution_type` records WHY the whisperer was
 *      credited, so every payment is auditable after the fact.
 *
 * PAYMENT TIMING: approval already happened when the sower accepted the
 * whisperer on the seed. The earning is credited the moment the payment
 * completes — the sower never approves a payout again.
 */

import { supabase } from '@/integrations/supabase/client';

export const WHISPER_REF_PARAM = 'w';
export const WHISPER_SESSION_PARAM = 'ws';

const STORAGE_KEY = 's2g.whisperer.attribution.v2';
const VISITOR_KEY = 's2g.whisperer.visitor';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type AttributionSource = 'ref_click' | 'last_touch';

export interface WhispererCredit {
  refCode: string;
  liveSessionId?: string | null;
  source: AttributionSource;
  at: number;
}

type Store = Record<string, WhispererCredit>;

const LAST_TOUCH = '__last__';

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    const now = Date.now();
    const fresh: Store = {};
    for (const [k, v] of Object.entries(parsed || {})) {
      if (v && typeof v.refCode === 'string' && now - Number(v.at || 0) < TTL_MS) fresh[k] = v;
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

/** Stable-ish anonymous visitor id, used only to de-duplicate click logs. */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

/** Remember that `refCode` brought this buyer to `seedId` (last touch wins). */
export function rememberWhisperer(
  refCode: string,
  seedId?: string | null,
  liveSessionId?: string | null,
) {
  if (!refCode) return;
  const store = read();
  const entry: WhispererCredit = {
    refCode: refCode.trim().toUpperCase(),
    liveSessionId: liveSessionId ?? null,
    source: 'ref_click',
    at: Date.now(),
  };
  store[LAST_TOUCH] = entry;
  if (seedId) store[seedId] = entry;
  write(store);
}

/**
 * The whisperer credit to send with a sale of this seed, if any.
 * A credit scoped to the seed counts as a direct click; a global fallback is
 * flagged `last_touch` so the server records the weaker attribution type.
 */
export function getWhispererCredit(seedId?: string | null): WhispererCredit | null {
  const store = read();
  if (seedId && store[seedId]) return { ...store[seedId], source: 'ref_click' };
  const last = store[LAST_TOUCH];
  return last ? { ...last, source: 'last_touch' } : null;
}

/** Back-compat helper: just the code credited with this seed. */
export function getWhispererFor(seedId?: string | null): string | null {
  return getWhispererCredit(seedId)?.refCode ?? null;
}

/** Clear attribution (e.g. after a completed order). */
export function clearWhispererAttribution() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Record the visit server-side so the whisperer sees real click numbers. */
export async function logWhispererClick(
  refCode: string,
  seedId?: string | null,
  liveSessionId?: string | null,
) {
  try {
    await supabase.rpc('log_whisperer_click', {
      _ref_code: refCode,
      _product_id: seedId ?? null,
      _visitor_id: getVisitorId(),
      _live_session_id: liveSessionId ?? null,
      _referrer_url: typeof document !== 'undefined' ? document.referrer || null : null,
    } as any);
  } catch (e) {
    console.warn('whisperer click log failed', e);
  }
}

/**
 * Capture `?w=<REF_CODE>` (and optional `?ws=<liveSessionId>`) from the current
 * URL. `seedId` scopes the credit to one seed when on a seed page.
 */
export function captureWhispererRefFromUrl(search: string, seedId?: string | null) {
  try {
    const params = new URLSearchParams(search);
    const code = params.get(WHISPER_REF_PARAM);
    const sessionId = params.get(WHISPER_SESSION_PARAM);
    if (code) {
      rememberWhisperer(code, seedId ?? null, sessionId);
      void logWhispererClick(code, seedId ?? null, sessionId);
    }
    return code;
  } catch {
    return null;
  }
}

/** Build a whisperer's personal share link for a seed from their ref code. */
export function buildWhispererShareLink(
  path: string,
  refCode: string,
  liveSessionId?: string | null,
) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://sow2growapp.com';
  const url = new URL(path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`);
  url.searchParams.set(WHISPER_REF_PARAM, refCode);
  if (liveSessionId) url.searchParams.set(WHISPER_SESSION_PARAM, liveSessionId);
  return url.toString();
}

/** Mint (or fetch) the ref code for one of MY active assignments. */
export async function ensureMyRefLink(
  assignmentId: string,
  liveSessionId?: string | null,
  sessionKind?: string | null,
): Promise<{ refLinkId: string; refCode: string }> {
  const { data, error } = await supabase.rpc('ensure_whisperer_ref_link', {
    _assignment_id: assignmentId,
    _live_session_id: liveSessionId ?? null,
    _session_kind: sessionKind ?? null,
  } as any);
  if (error) throw error;
  const row = Array.isArray(data) ? (data[0] as any) : (data as any);
  if (!row?.ref_code) throw new Error('Could not create your whisperer link');
  return { refLinkId: row.ref_link_id, refCode: row.ref_code };
}
