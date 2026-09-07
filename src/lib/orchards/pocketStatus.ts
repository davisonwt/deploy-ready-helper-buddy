// P0-5 Phase C3: read a member's own orchard pockets (RLS lets a bestower
// see their own orchard_holdings and orchard_refunds rows) and turn them
// into the plain-words state from refundLabels. Used by My Seeds and the
// orchard page. Read-only.

import { supabase } from '@/integrations/supabase/client';
import { pocketState, type PocketState } from '@/lib/orchards/refundLabels';

export interface PocketRow {
  holdingId: string;
  bestowalId: string;
  orchardId: string;
  status: string;
  gross: number;
  pockets: number;
  rail: string;
  state: PocketState;
}

// orchard_* tables are not in the generated client types yet.
const db = supabase as any;

async function attachRefunds(holdings: any[]): Promise<PocketRow[]> {
  const refundIds = holdings.map((h) => h.refund_id).filter(Boolean);
  const refunds = refundIds.length
    ? (await db.from('orchard_refunds').select('id, status, rail, rail_reference, environment').in('id', refundIds)).data ?? []
    : [];
  const refundById = new Map<string, any>(refunds.map((r: any) => [r.id, r]));
  return holdings.map((h) => ({
    holdingId: h.id,
    bestowalId: h.bestowal_id,
    orchardId: h.orchard_id,
    status: h.status,
    gross: Number(h.gross_amount || 0),
    pockets: Number(h.pockets || 1),
    rail: h.rail,
    // Phase D: the wording for a released pocket depends on the orchard kind
    // (Launch: released to the sower; Uplift: S2G pays the parties).
    state: pocketState(h.status, h.refund_id ? refundById.get(h.refund_id) ?? null : null, h.orchards?.orchard_kind ?? 'launch'),
  }));
}

const HOLDING_SELECT = 'id, bestowal_id, orchard_id, status, gross_amount, pockets, rail, refund_id, orchards:orchard_id ( orchard_kind )';

/** Pocket states for a set of bestowal ids (My Seeds). Missing ids simply have no entry. */
export async function pocketStatesForBestowals(bestowalIds: string[]): Promise<Map<string, PocketRow>> {
  const out = new Map<string, PocketRow>();
  if (bestowalIds.length === 0) return out;
  const { data, error } = await db
    .from('orchard_holdings')
    .select(HOLDING_SELECT)
    .in('bestowal_id', bestowalIds);
  if (error || !data) return out;
  for (const row of await attachRefunds(data)) out.set(row.bestowalId, row);
  return out;
}

/** The signed-in member's own pockets in one orchard (orchard page). */
export async function myPocketsForOrchard(orchardId: string, userId: string): Promise<PocketRow[]> {
  const { data, error } = await db
    .from('orchard_holdings')
    .select(HOLDING_SELECT)
    .eq('orchard_id', orchardId)
    .eq('bestower_user_id', userId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return attachRefunds(data);
}
