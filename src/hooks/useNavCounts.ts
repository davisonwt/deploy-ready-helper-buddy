// Cockpit sidebar nav badges -- module-level singleton (same pattern as
// src/lib/media/radioPlayback.ts) so StallSideNav and StallBookshelfNav
// share ONE fetch/interval rather than each polling independently; both
// are CSS-hidden-not-unmounted at the "wrong" breakpoint (StallInteriorView
// renders StallSideNav twice, `hidden lg:flex` / inside a drawer), so a
// per-component interval would double the RPC calls for no reason.
//
// get_nav_counts() (supabase/migrations/20260920140000_nav_counts_rpc.sql)
// covers four of the six badges -- Tribal Gardens, Sleeping Seeds, My
// Listings, My Tribe. The other two are NOT part of this store:
//   - Live Now has its own hook, useTribalLiveOrchard() -- reusing that
//     store directly (not this one) is what guarantees the nav badge can
//     never disagree with the Live Now page, since both read the exact
//     same realtime presence value, not two independent computations of
//     "the same thing".
//   - Wandering Hearts has no badge at all (see the migration's own
//     comment for why) -- there is no `wandering_hearts` field here to
//     leave at some placeholder value; it's simply absent.
//
// Refresh: fetch on first subscribe, then every 60s while the tab is
// visible -- paused while hidden (no point polling a nav nobody can see),
// with an immediate refetch on becoming visible again so returning to the
// tab doesn't show a stale number for up to 60s.

import { useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NavCounts {
  tribal_gardens: number;
  sleeping_seeds: number;
  my_listings: number;
  my_tribe: number;
}

type Listener = () => void;

const REFRESH_MS = 60_000;

let counts: NavCounts | null = null;
let loading = false;
const listeners = new Set<Listener>();
let intervalTimer: ReturnType<typeof setInterval> | null = null;
let visibilityWired = false;

function notify() {
  listeners.forEach((l) => l());
}

async function fetchCounts() {
  if (loading) return;
  loading = true;
  try {
    const { data, error } = await supabase.rpc('get_nav_counts' as any);
    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        counts = {
          tribal_gardens: row.tribal_gardens ?? 0,
          sleeping_seeds: row.sleeping_seeds ?? 0,
          my_listings: row.my_listings ?? 0,
          my_tribe: row.my_tribe ?? 0,
        };
        notify();
      }
    }
  } finally {
    loading = false;
  }
}

function startInterval() {
  if (intervalTimer) return;
  intervalTimer = setInterval(() => {
    if (document.visibilityState === 'visible') void fetchCounts();
  }, REFRESH_MS);
}

function wireVisibilityOnce() {
  if (visibilityWired || typeof document === 'undefined') return;
  visibilityWired = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void fetchCounts();
  });
}

export function getNavCounts(): NavCounts | null {
  return counts;
}

export function subscribeNavCounts(listener: Listener): () => void {
  wireVisibilityOnce();
  listeners.add(listener);
  if (counts === null) void fetchCounts();
  startInterval();
  return () => listeners.delete(listener);
}

/** null while the first fetch is still in flight -- callers render nothing for a badge until it resolves, rather than a misleading 0. */
export function useNavCounts(): NavCounts | null {
  return useSyncExternalStore(subscribeNavCounts, getNavCounts, getNavCounts);
}
