import { supabase } from '@/integrations/supabase/client';

/**
 * Escrow data-access layer.
 *
 * S2G receives every bestowal and holds it when the seed physically ships.
 * Digital seeds release the moment payment confirms; physical seeds release
 * when the bestower confirms delivery or the 3-day auto-release window after
 * "delivered" elapses. Disputed lines only a GoSat can resolve.
 *
 * The money split (15% S2G, whisperer % on an approved link, remainder to the
 * sower) is decided in the database at sale time — nothing here changes it.
 */

export type ReleaseStatus = 'held' | 'released' | 'disputed' | 'refunded';

export interface EscrowBestowal {
  id: string;
  bestower_id: string;
  sower_id: string | null;
  product_id: string | null;
  amount: number;
  s2g_fee: number;
  sower_amount: number;
  whisperer_amount: number | null;
  whisperer_id: string | null;
  status: string;
  release_status: ReleaseStatus;
  hold_reason: string | null;
  delivery_type: string;
  shipped_at: string | null;
  delivered_at: string | null;
  delivery_confirmed_at: string | null;
  auto_release_at: string | null;
  released_at: string | null;
  dispute_reason: string | null;
  payout_status: string;
  created_at: string;
  products?: { title: string | null; cover_image_url: string | null; delivery_type: string | null } | null;
}

const SELECT = `
  id, bestower_id, sower_id, product_id, amount, s2g_fee, sower_amount,
  whisperer_amount, whisperer_id, status, release_status, hold_reason,
  delivery_type, shipped_at, delivered_at, delivery_confirmed_at,
  auto_release_at, released_at, dispute_reason, payout_status, created_at,
  products:product_id ( title, cover_image_url, delivery_type )
`;

/** Everything this user bought. */
export async function fetchMyPurchases(userId: string): Promise<EscrowBestowal[]> {
  const { data, error } = await (supabase.from('product_bestowals') as any)
    .select(SELECT)
    .eq('bestower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EscrowBestowal[];
}

/** Everything this user sold. */
export async function fetchMySales(userId: string): Promise<EscrowBestowal[]> {
  const { data, error } = await (supabase.from('product_bestowals') as any)
    .select(SELECT)
    .eq('sower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EscrowBestowal[];
}

/** GoSat view: everything currently held or disputed. */
export async function fetchEscrowQueue(): Promise<EscrowBestowal[]> {
  const { data, error } = await (supabase.from('product_bestowals') as any)
    .select(SELECT)
    .in('release_status', ['held', 'disputed'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EscrowBestowal[];
}

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await (supabase.rpc as any)(name, args);
  if (error) throw error;
  if (data && data.success === false) throw new Error(data.error ?? 'action_failed');
  return data;
}

/** Bestower confirms the parcel arrived — releases sower + whisperer instantly. */
export const confirmDelivery = (bestowalId: string) =>
  rpc('confirm_delivery', { _bestowal_id: bestowalId });

/** Bestower raises an issue — freezes the money until a GoSat decides. */
export const raiseDeliveryIssue = (bestowalId: string, reason: string) =>
  rpc('raise_delivery_issue', { _bestowal_id: bestowalId, _reason: reason });

/** Sower/courier marks the parcel shipped or delivered (starts the 3-day clock). */
export const markDeliveryProgress = (bestowalId: string, stage: 'shipped' | 'delivered') =>
  rpc('mark_delivery_progress', { _bestowal_id: bestowalId, _stage: stage });

/** GoSat force-release or refund. */
export const gosatResolveEscrow = (
  bestowalId: string,
  action: 'release' | 'refund',
  notes?: string,
) => rpc('gosat_resolve_escrow', { _bestowal_id: bestowalId, _action: action, _notes: notes ?? null });

/** Held vs available totals for a sower (or a bestower's held exposure). */
export function summariseEarnings(rows: EscrowBestowal[]) {
  let held = 0;
  let available = 0;
  let paid = 0;
  for (const r of rows) {
    const amt = Number(r.sower_amount || 0);
    if (r.release_status === 'held' || r.release_status === 'disputed') held += amt;
    else if (r.release_status === 'released') {
      if (r.payout_status === 'paid') paid += amt;
      else available += amt;
    }
  }
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  return { held: r2(held), available: r2(available), paid: r2(paid) };
}
